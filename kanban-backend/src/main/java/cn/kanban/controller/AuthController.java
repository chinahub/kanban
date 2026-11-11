package cn.kanban.controller;

import cn.kanban.dto.LoginRequest;
import cn.kanban.dto.LoginResponse;
import cn.kanban.dto.MeResponse;
import cn.kanban.entity.User;
import cn.kanban.service.AuthService;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.web.annotation.GetMapping;
import cn.jiebaba.summer.web.annotation.PostMapping;
import cn.jiebaba.summer.web.annotation.RequestBody;
import cn.jiebaba.summer.web.annotation.RequestMapping;
import cn.jiebaba.summer.web.annotation.RequestParam;
import cn.jiebaba.summer.web.annotation.RestController;
import cn.jiebaba.summer.web.http.WebRequest;
import cn.jiebaba.summer.web.http.WebResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(@RequestParam("token") String token) {
        return authService.refresh(token);
    }

    @GetMapping("/me")
    public MeResponse me(WebRequest req, WebResponse resp) {
        User user = authService.authenticate(req, resp);
        if (user == null) return null;
        return authService.me(user);
    }
}
