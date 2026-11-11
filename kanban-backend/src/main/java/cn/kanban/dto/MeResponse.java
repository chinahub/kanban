package cn.kanban.dto;

public class MeResponse {
    public Long id;
    public String username;
    public String email;
    public String displayName;
    public Boolean isPlatformAdmin;

    public MeResponse() {}
    public MeResponse(Long id, String username, String email, String displayName, Boolean isPlatformAdmin) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.displayName = displayName;
        this.isPlatformAdmin = isPlatformAdmin;
    }
}
