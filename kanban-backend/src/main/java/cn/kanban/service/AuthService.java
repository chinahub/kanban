package cn.kanban.service;

import cn.kanban.dto.LoginRequest;
import cn.kanban.dto.LoginResponse;
import cn.kanban.dto.MeResponse;
import cn.kanban.entity.User;
import cn.kanban.util.JwtUtil;
import cn.kanban.util.PasswordUtil;
import cn.kanban.util.CurrentContext;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.jiebaba.summer.core.json.Json;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final WorkspaceService workspaceService;

    public AuthService(UserService userService, JwtUtil jwtUtil, WorkspaceService workspaceService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.workspaceService = workspaceService;
    }

    public User authenticate(WebRequest req, WebResponse resp) {
        String header = req.header("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            reject(resp, 401, "Unauthorized", "Missing Bearer token");
            return null;
        }
        String token = header.substring(7).trim();
        try {
            Map<String, Object> claims = jwtUtil.parse(token);
            String type = (String) claims.get(JwtUtil.CLAIM_TYPE);
            if (!JwtUtil.TYPE_ACCESS.equals(type)) {
                reject(resp, 401, "Unauthorized", "Wrong token type: " + type);
                return null;
            }
            Object uidVal = claims.get(JwtUtil.CLAIM_USER_ID);
            if (!(uidVal instanceof Number n)) {
                reject(resp, 401, "Unauthorized", "Invalid token: missing uid");
                return null;
            }
            User user = userService.findById(n.longValue());
            if (user == null || !"ACTIVE".equals(user.status)) {
                reject(resp, 401, "Unauthorized", "User not found or inactive");
                return null;
            }
            return user;
        } catch (JwtUtil.JwtException e) {
            reject(resp, 401, "Unauthorized", "Invalid token: " + e.getMessage());
            return null;
        }
    }

    private static void reject(WebResponse resp, int status, String error, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status);
        m.put("error", error);
        m.put("message", message);
        resp.status(status).contentType("application/json;charset=UTF-8").body(Json.stringify(m));
    }

    /**
     * 从 X-Workspace-Id 请求头解析当前工作空间 id，并校验用户是否有权访问。
     * 失败时写响应体并返回 null。平台管理员可访问任意工作空间。
     */
    public Long resolveWorkspaceId(WebRequest req, WebResponse resp, User user) {
        String header = req.header("X-Workspace-Id");
        if (header == null || header.isBlank()) {
            reject(resp, 400, "Bad Request", "Missing X-Workspace-Id header");
            return null;
        }
        Long wsId;
        try {
            wsId = Long.parseLong(header.trim());
        } catch (NumberFormatException e) {
            reject(resp, 400, "Bad Request", "Invalid X-Workspace-Id: " + header);
            return null;
        }
        boolean admin = Boolean.TRUE.equals(user.isPlatformAdmin);
        if (!admin) {
            var memberships = workspaceService.listByUserId(user.id);
            boolean member = memberships.stream().anyMatch(w -> w.id.equals(wsId));
            if (!member) {
                reject(resp, 403, "Forbidden", "Not a member of workspace " + wsId);
                return null;
            }
        }
        CurrentContext.setWorkspaceId(wsId);
        return wsId;
    }

    public LoginResponse login(LoginRequest req) {
        if (req == null || req.username() == null || req.password() == null) {
            throw new IllegalArgumentException("username and password are required");
        }
        User u = userService.findByUsername(req.username().trim());
        if (u == null || !PasswordUtil.matches(req.password(), u.passwordHash)) {
            throw new IllegalArgumentException("invalid username or password");
        }
        if (!"ACTIVE".equals(u.status)) {
            throw new IllegalArgumentException("user is not active");
        }
        return buildLoginResponse(u);
    }

    public LoginResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("refresh token is required");
        }
        Map<String, Object> claims;
        try {
            claims = jwtUtil.parse(refreshToken.trim());
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid refresh token");
        }
        if (!JwtUtil.TYPE_REFRESH.equals(claims.get(JwtUtil.CLAIM_TYPE))) {
            throw new IllegalArgumentException("not a refresh token");
        }
        Object uidVal = claims.get(JwtUtil.CLAIM_USER_ID);
        if (!(uidVal instanceof Number n)) {
            throw new IllegalArgumentException("invalid refresh token");
        }
        User u = userService.findById(n.longValue());
        if (u == null || !"ACTIVE".equals(u.status)) {
            throw new IllegalArgumentException("user inactive");
        }
        return buildLoginResponse(u);
    }

    public MeResponse me(User u) {
        if (u == null) throw new IllegalArgumentException("not authenticated");
        return new MeResponse(u.id, u.username, u.email, u.displayName, u.isPlatformAdmin);
    }

    private LoginResponse buildLoginResponse(User u) {
        boolean admin = Boolean.TRUE.equals(u.isPlatformAdmin);
        String access = jwtUtil.createAccessToken(u.id, u.username, admin);
        String refresh = jwtUtil.createRefreshToken(u.id, u.username, admin);
        return new LoginResponse(access, refresh, jwtUtil.getAccessTtlSeconds(), me(u));
    }
}
