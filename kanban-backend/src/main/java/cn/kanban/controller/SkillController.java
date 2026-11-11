package cn.kanban.controller;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.kanban.skill.SkillChatService;
import cn.kanban.skill.SkillReferenceIndexer;

import java.util.Map;

/**
 * 可视化技能管理接口：技能参考文档索引重建与 BGE-M3 向量化就绪探测。
 */
@RestController
@RequestMapping("/api/ai/skills")
public class SkillController {

    @Autowired
    private AuthService authService;

    @Autowired
    private SkillReferenceIndexer skillReferenceIndexer;

    @Autowired
    private SkillChatService skillChatService;

    /**
     * 重建全部技能的 references 向量索引（分钟级耗时；幂等 upsert，可重复调用）。
     */
    @PostMapping("/reindex")
    public Map<String, Object> reindex(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        int chunks = skillReferenceIndexer.reindex();
        return Map.of("chunks", chunks);
    }

    /**
     * 探测 BGE-M3 向量化是否就绪：返回向量维度（应为 1024）。
     * 模型文件/tokenizer 缺失或 onnxruntime 加载失败时抛异常，便于定位部署问题。
     */
    @GetMapping("/embed-test")
    public Map<String, Object> embedTest(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        return Map.of("dimensions", skillChatService.embeddingDimensions());
    }
}
