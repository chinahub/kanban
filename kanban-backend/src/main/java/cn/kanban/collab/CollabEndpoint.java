package cn.kanban.collab;

import cn.jiebaba.summer.core.util.JsonUtil;
import cn.jiebaba.summer.web.websocket.CloseReason;
import cn.jiebaba.summer.web.websocket.OnClose;
import cn.jiebaba.summer.web.websocket.OnError;
import cn.jiebaba.summer.web.websocket.OnMessage;
import cn.jiebaba.summer.web.websocket.OnOpen;
import cn.jiebaba.summer.web.websocket.WebSocketEndpoint;
import cn.jiebaba.summer.web.websocket.WebSocketSession;
import cn.kanban.entity.User;
import cn.kanban.service.UserService;
import cn.kanban.util.JwtUtil;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 协同编辑 WebSocket 端点（PRD §7.2 阶段 6）：按看板分房间广播在线成员与保存事件。
 * 令牌走路径段 /ws/collab/{projectId}/{token}（summer 会话不暴露查询串/请求头），
 * 握手后校验 JWT，无效即关闭连接。
 * 协同策略为「在线可见 + 保存广播 + 冲突提示」：不做 CRDT/OT 合并，
 * 他人保存时编辑者会收到提醒并可重新加载最新配置（见前端 collabClient）。
 */
@WebSocketEndpoint("/ws/collab/{projectId}/{token}")
public class CollabEndpoint {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger.getLogger(CollabEndpoint.class.getName());

    /** 房间表：projectId → 该看板的协作会话集合 */
    private static final Map<Long, Set<WebSocketSession>> ROOMS = new ConcurrentHashMap<>();

    /** 会话 id → 用户摘要（打开时解析 token 缓存，避免每条消息重复查库） */
    private static final Map<String, UserBrief> USERS = new ConcurrentHashMap<>();

    /** 房间内广播的用户摘要（仅 id 与展示名，不含敏感字段） */
    private record UserBrief(long id, String name) {}

    private final JwtUtil jwtUtil;
    private final UserService userService;

    public CollabEndpoint(JwtUtil jwtUtil, UserService userService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    /** 连接建立：校验令牌并加入房间，向本人发送 hello、向房间广播最新成员名单 */
    @OnOpen
    public void onOpen(WebSocketSession session) {
        // 只记 projectId 与令牌长度，不落完整路径（路径含 access token）
        LOG.info("collab: open projectId=" + session.pathVariable("projectId")
                + " tokenLen=" + (session.pathVariable("token") == null ? -1 : session.pathVariable("token").length()));
        Long projectId = parseLong(session.pathVariable("projectId"));
        UserBrief user = resolveUser(session.pathVariable("token"));
        if (projectId == null || user == null) {
            session.close(CloseReason.of(1008, "unauthorized"));
            return;
        }
        ROOMS.computeIfAbsent(projectId, k -> ConcurrentHashMap.newKeySet()).add(session);
        USERS.put(session.id(), user);
        Map<String, Object> hello = new LinkedHashMap<>();
        hello.put("type", "hello");
        hello.put("projectId", projectId);
        hello.put("you", user);
        session.sendText(JsonUtil.toJsonStr(hello));
        broadcast(projectId, null, rosterJson(projectId));
    }

    /**
     * 消息中继：客户端发送 {type:'saved', ts} 等 JSON 文本帧，
     * 服务端补上操作者身份后转发给房间内其他人；协议外消息忽略。
     */
    @OnMessage
    public void onMessage(WebSocketSession session, String message) {
        Long projectId = parseLong(session.pathVariable("projectId"));
        if (projectId == null) return;
        UserBrief user = USERS.get(session.id());
        if (user == null) return;
        String type;
        try {
            type = JsonUtil.parseObj(message).getStr("type");
        } catch (Exception e) {
            return;
        }
        if (!"saved".equals(type)) return;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("type", "saved");
        out.put("user", user);
        out.put("ts", System.currentTimeMillis());
        broadcast(projectId, session, JsonUtil.toJsonStr(out));
    }

    /** 连接关闭：移出房间并广播最新成员名单 */
    @OnClose
    public void onClose(WebSocketSession session) {
        Long projectId = parseLong(session.pathVariable("projectId"));
        USERS.remove(session.id());
        if (projectId == null) return;
        Set<WebSocketSession> room = ROOMS.get(projectId);
        if (room != null) {
            room.remove(session);
            if (room.isEmpty()) ROOMS.remove(projectId, room);
            broadcast(projectId, null, rosterJson(projectId));
        }
    }

    /** 连接异常：从房间摘除，交给容器按已关闭处理 */
    @OnError
    public void onError(WebSocketSession session, Throwable error) {
        Long projectId = parseLong(session.pathVariable("projectId"));
        USERS.remove(session.id());
        if (projectId != null) {
            Set<WebSocketSession> room = ROOMS.get(projectId);
            if (room != null) {
                room.remove(session);
                if (room.isEmpty()) ROOMS.remove(projectId, room);
            }
        }
    }

    /** 解析路径段中的 access token → 用户摘要；令牌无效或用户非 ACTIVE 返回 null */
    private UserBrief resolveUser(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            Map<String, Object> claims = jwtUtil.parse(token);
            if (!JwtUtil.TYPE_ACCESS.equals(claims.get(JwtUtil.CLAIM_TYPE))) return null;
            Object uidVal = claims.get(JwtUtil.CLAIM_USER_ID);
            if (!(uidVal instanceof Number n)) return null;
            User user = userService.findById(n.longValue());
            if (user == null) {
                LOG.warning("collab: user not found, uid=" + n.longValue());
                return null;
            }
            if (!"ACTIVE".equals(user.status)) {
                LOG.warning("collab: user not ACTIVE, uid=" + n.longValue() + " status=" + user.status);
                return null;
            }
            String name = user.displayName != null && !user.displayName.isBlank() ? user.displayName : user.username;
            return new UserBrief(user.id, name);
        } catch (Exception e) {
            LOG.warning("collab: resolveUser failed: " + e);
            return null;
        }
    }

    /** 房间成员名单 JSON（去重：同用户多标签页只算一个身份展示） */
    private String rosterJson(Long projectId) {
        Set<WebSocketSession> room = ROOMS.getOrDefault(projectId, Set.of());
        List<Map<String, Object>> users = new ArrayList<>();
        Set<Long> seen = new java.util.HashSet<>();
        for (WebSocketSession s : room) {
            UserBrief u = USERS.get(s.id());
            if (u == null || !seen.add(u.id())) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", u.id());
            item.put("name", u.name());
            users.add(item);
        }
        return JsonUtil.toJsonStr(Map.of("type", "roster", "users", users));
    }

    /** 向房间广播文本消息；exclude 非空时跳过发起者，发送失败的会话直接摘除 */
    private void broadcast(Long projectId, WebSocketSession exclude, String message) {
        Set<WebSocketSession> room = ROOMS.get(projectId);
        if (room == null) return;
        for (WebSocketSession s : room) {
            if (s.isClosed() || (exclude != null && Objects.equals(s.id(), exclude.id()))) continue;
            try {
                s.sendText(message);
            } catch (Exception e) {
                room.remove(s);
            }
        }
    }

    /** 宽松解析路径变量为 Long；非法返回 null */
    private Long parseLong(String raw) {
        if (raw == null) return null;
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
