package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.json.Json;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.PutMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.dto.AiConfigDto;
import cn.kanban.dto.AiConfigSaveRequest;
import cn.kanban.dto.AiConfigTestResponse;
import cn.kanban.dto.AiUsageDto;
import cn.kanban.entity.User;
import cn.kanban.service.AiConfigService;
import cn.kanban.service.AiUsageService;
import cn.kanban.service.AuthService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 平台级配置与 token 用量接口（仅平台管理员）。
 * 配置存 ai_config 表（api-key 加密），application.yml 仅作兜底默认值；
 * 用量统计聚合自 ai_call_log 的 token 列。
 */
@RestController
@RequestMapping("/api/ai")
public class AiConfigController {

    @Autowired
    private AuthService authService;

    @Autowired
    private AiConfigService aiConfigService;

    @Autowired
    private AiUsageService aiUsageService;

    /** 两套 AI 配置的脱敏视图列表。 */
    @GetMapping("/config")
    public List<AiConfigDto> listConfig(WebRequest req, WebResponse resp) {
        User user = requirePlatformAdmin(req, resp);
        if (user == null) return null;
        return aiConfigService.listViews();
    }

    /** 保存某个配置键（ladv / assistant），返回保存后的脱敏视图。 */
    @PutMapping("/config/{key}")
    public AiConfigDto saveConfig(@PathVariable String key, @RequestBody AiConfigSaveRequest body,
                                  WebRequest req, WebResponse resp) {
        User user = requirePlatformAdmin(req, resp);
        if (user == null) return null;
        if (!AiConfigService.KEYS.contains(key)) {
            throw new IllegalArgumentException("unknown config key: " + key);
        }
        if (body == null) {
            throw new IllegalArgumentException("request body is required");
        }
        return aiConfigService.save(key, body, user.id);
    }

    /** 用表单内容（无需先保存）探测模型连通性；视觉模型会附带测试图验证图片输入能力。 */
    @PostMapping("/config/{key}/test")
    public AiConfigTestResponse testConfig(@PathVariable String key, @RequestBody AiConfigSaveRequest body,
                                           WebRequest req, WebResponse resp) {
        User user = requirePlatformAdmin(req, resp);
        if (user == null) return null;
        if (!AiConfigService.KEYS.contains(key)) {
            throw new IllegalArgumentException("unknown config key: " + key);
        }
        return aiConfigService.testConnection(key, body);
    }

    /** token 消耗统计：总量、按功能来源、按天（近 30 天）。 */
    @GetMapping("/usage")
    public AiUsageDto usage(WebRequest req, WebResponse resp) {
        User user = requirePlatformAdmin(req, resp);
        if (user == null) return null;
        return aiUsageService.summarize();
    }

    /**
     * 鉴权并校验平台管理员身份；失败时写 401/403 响应体并返回 null。
     */
    private User requirePlatformAdmin(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        if (!Boolean.TRUE.equals(user.isPlatformAdmin)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", 403);
            m.put("error", "Forbidden");
            m.put("message", "平台管理员才能访问 AI 配置与用量统计");
            resp.status(403).contentType("application/json;charset=UTF-8").body(Json.stringify(m));
            return null;
        }
        return user;
    }
}
