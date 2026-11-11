package cn.kanban.config;

import cn.kanban.util.JwtUtil;
import cn.jiebaba.summer.core.annotation.Bean;
import cn.jiebaba.summer.core.annotation.Configuration;
import cn.jiebaba.summer.core.annotation.Value;

@Configuration
public class JwtConfig {

    @Value("${kanban.jwt.secret}")
    private String secret;

    @Value("${kanban.jwt.access-ttl-seconds}")
    private long accessTtl;

    @Value("${kanban.jwt.refresh-ttl-seconds}")
    private long refreshTtl;

    @Bean
    public JwtUtil jwtUtil() {
        return new JwtUtil(secret, accessTtl, refreshTtl);
    }
}
