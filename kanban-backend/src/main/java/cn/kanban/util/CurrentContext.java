package cn.kanban.util;

import cn.kanban.entity.User;

public final class CurrentContext {
    private static final ThreadLocal<User> USER = new ThreadLocal<>();
    private static final ThreadLocal<Long> WORKSPACE_ID = new ThreadLocal<>();

    private CurrentContext() {}

    public static void setUser(User u) { USER.set(u); }
    public static User getUser() { return USER.get(); }
    public static Long getUserId() { User u = USER.get(); return u == null ? null : u.id; }

    public static void setWorkspaceId(Long id) { WORKSPACE_ID.set(id); }
    public static Long getWorkspaceId() { return WORKSPACE_ID.get(); }

    public static void clear() {
        USER.remove();
        WORKSPACE_ID.remove();
    }
}
