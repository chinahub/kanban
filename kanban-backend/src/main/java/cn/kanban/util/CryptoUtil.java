package cn.kanban.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM 凭据加解密（PRD §7.1：数据源密码加密）。
 * 密钥取自环境变量 KANBAN_AES_KEY（base64 编码 32 字节）；
 * 未设置时回退到固定派生密钥（仅开发期，生产须配置环境变量）。
 * 密文格式：base64(iv(12) || ciphertext || tag(16))。
 */
public final class CryptoUtil {
    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;
    private static final int TAG_LEN_BITS = 128;
    private static final SecureRandom RNG = new SecureRandom();
    private static final byte[] KEY = resolveKey();

    private CryptoUtil() {}

    private static byte[] resolveKey() {
        String env = System.getenv("KANBAN_AES_KEY");
        if (env != null && !env.isBlank()) {
            try {
                byte[] k = Base64.getDecoder().decode(env.trim());
                if (k.length == 32) return k;
            } catch (IllegalArgumentException ignored) {
                // 环境变量解码失败，回退默认
            }
        }
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest("kanban-default-aes-key-v1".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            byte[] k = new byte[32];
            for (int i = 0; i < 32; i++) k[i] = (byte) i;
            return k;
        }
    }

    public static String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[IV_LEN];
            RNG.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(KEY, "AES"), new GCMParameterSpec(TAG_LEN_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new RuntimeException("AES encrypt failed: " + e.getMessage(), e);
        }
    }

    public static String decrypt(String base64) {
        if (base64 == null || base64.isBlank()) return null;
        try {
            byte[] all = Base64.getDecoder().decode(base64);
            if (all.length < IV_LEN + 1) return null;
            byte[] iv = new byte[IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(KEY, "AES"), new GCMParameterSpec(TAG_LEN_BITS, iv));
            byte[] pt = cipher.doFinal(all, IV_LEN, all.length - IV_LEN);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("AES decrypt failed: " + e.getMessage(), e);
        }
    }
}
