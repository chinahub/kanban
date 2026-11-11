package cn.kanban.controller;

import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PathVariable;
import cn.jiebaba.summer.web.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static java.util.Map.entry;

@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "kanban-backend",
                "version", "0.0.1-SNAPSHOT",
                "time", Instant.now().toString()
        );
    }

    @GetMapping("/test/")
    public Map<String, Object> test() throws InterruptedException {
        Thread.sleep(3000);
        return  Map.ofEntries(
                entry("userId", 12345),
                entry("username", "jack_ma"),
                entry("email", "jack@example.com"),
                entry("roles", List.of("admin", "editor")),
                entry("preferences", Map.of(
                        "timezone", "Asia/Shanghai",
                        "newsletter", true
                )),
                entry("lastLogin", "2026-07-07T12:00:00Z"),
                entry("active", true),
                entry("score", 99.5),
                entry("referralCode", "REF2026"),
                entry("address", Map.of(
                        "street", "南京路 88 号",
                        "city", "上海",
                        "zip", "200001"
                ))
        );
    }
}
