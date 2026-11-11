package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.AiAssistRequest;
import cn.kanban.dto.AiAssistResponse;
import cn.kanban.dto.LadVRequest;
import cn.kanban.dto.LadVResponse;
import cn.kanban.dto.SkillChatRequest;
import cn.kanban.dto.SkillChatResponse;
import cn.kanban.entity.Project;
import cn.kanban.entity.User;
import cn.kanban.service.AiAssistantService;
import cn.kanban.service.AuthService;
import cn.kanban.service.LadVService;
import cn.kanban.service.ProjectService;
import cn.kanban.skill.SkillChatService;

import java.util.NoSuchElementException;

/**
 * AI 助手接口：在编辑器内对选中组件执行自然语言改样式（PRD §7.1 阶段5）。
 */
@RestController
@RequestMapping("/api/projects")
public class AiController {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private AiAssistantService aiAssistantService;

    @Autowired
    private SkillChatService skillChatService;

    @Autowired
    private LadVService ladVService;

    @PostMapping("/{id}/ai-assist")
    public AiAssistResponse assist(@PathVariable Long id, @RequestBody AiAssistRequest body,
                                   WebRequest req, WebResponse resp) {
        User user = requireOwner(id, req, resp);
        if (user == null) return null;
        if (body == null || body.instruction() == null || body.instruction().isBlank()) {
            throw new IllegalArgumentException("instruction is required");
        }
        return aiAssistantService.assist(user.id, id, body);
    }

    /**
     * 可视化技能对话：模型自选 AntV 技能（load_skill）、按需检索参考文档（search_references），
     * 产出图表代码/图片/图标。单轮无状态。
     */
    @PostMapping("/{id}/skill-chat")
    public SkillChatResponse skillChat(@PathVariable Long id, @RequestBody SkillChatRequest body,
                                       WebRequest req, WebResponse resp) {
        User user = requireOwner(id, req, resp);
        if (user == null) return null;
        if (body == null || body.message() == null || body.message().isBlank()) {
            throw new IllegalArgumentException("message is required");
        }
        try {
            return new SkillChatResponse(skillChatService.chat(user.id, id, body.message()), null);
        } catch (Exception e) {
            return new SkillChatResponse(null, "技能对话调用失败：" + e.getMessage());
        }
    }

    /**
     * LADV 智能生成（PRD §4.13）：上传大屏设计稿 base64，视觉模型还原为组件布局 JSON。
     * 未配置视觉模型 Key 或调用失败时以 error 字段返回明确原因，HTTP 状态保持 200。
     */
    @PostMapping("/{id}/ladv")
    public LadVResponse ladv(@PathVariable Long id, @RequestBody LadVRequest body,
                             WebRequest req, WebResponse resp) {
        User user = requireOwner(id, req, resp);
        if (user == null) return null;
        if (body == null || body.image() == null || body.image().isBlank()) {
            throw new IllegalArgumentException("image is required");
        }
        return ladVService.generate(user.id, id, body);
    }

    /**
     * 鉴权并校验看板归属当前工作空间，失败时写响应体并返回 null。
     */
    private User requireOwner(Long projectId, WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        Long wsId = authService.resolveWorkspaceId(req, resp, user);
        if (wsId == null) return null;
        Project p = projectService.findById(projectId);
        if (p == null || !wsId.equals(p.workspaceId)) {
            throw new NoSuchElementException("project not found");
        }
        return user;
    }
}
