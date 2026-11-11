package cn.kanban.dto;

public class LoginResponse {
    public String accessToken;
    public String refreshToken;
    public long expiresIn;
    public MeResponse user;

    public LoginResponse() {}
    public LoginResponse(String accessToken, String refreshToken, long expiresIn, MeResponse user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.user = user;
    }
}
