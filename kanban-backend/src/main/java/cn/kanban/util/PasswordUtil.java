package cn.kanban.util;

import cn.jiebaba.summer.security.crypto.BCryptPasswordEncoder;
import cn.jiebaba.summer.security.crypto.PasswordEncoder;

public final class PasswordUtil {
    private static final int STRENGTH = 10;
    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(STRENGTH);

    private PasswordUtil() {}

    public static String hash(String raw) {
        if (raw == null) return null;
        return ENCODER.encode(raw);
    }

    public static boolean matches(String raw, String hashed) {
        if (raw == null || hashed == null) return false;
        try {
            return ENCODER.matches(raw, hashed);
        } catch (Exception e) {
            return false;
        }
    }
}
