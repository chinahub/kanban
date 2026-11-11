package cn.kanban.util;

import cn.jiebaba.summer.core.util.JsonUtil;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

public final class JwtUtil {

    public static final String CLAIM_USER_ID = "uid";
    public static final String CLAIM_USERNAME = "usr";
    public static final String CLAIM_PLATFORM_ADMIN = "adm";
    public static final String CLAIM_TYPE = "typ";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final String HEADER = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final byte[] key;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public JwtUtil(String secret, long accessTtlSeconds, long refreshTtlSeconds) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, bytes.length);
            bytes = padded;
        }
        this.key = bytes;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    public String createAccessToken(Long userId, String username, boolean platformAdmin) {
        return create(userId, username, platformAdmin, TYPE_ACCESS, accessTtlSeconds);
    }

    public String createRefreshToken(Long userId, String username, boolean platformAdmin) {
        return create(userId, username, platformAdmin, TYPE_REFRESH, refreshTtlSeconds);
    }

    public long getAccessTtlSeconds() { return accessTtlSeconds; }

    private String create(Long userId, String username, boolean platformAdmin, String type, long ttlSeconds) {
        long now = System.currentTimeMillis() / 1000;
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put(CLAIM_USER_ID, userId);
        claims.put(CLAIM_USERNAME, username);
        claims.put(CLAIM_PLATFORM_ADMIN, platformAdmin);
        claims.put(CLAIM_TYPE, type);
        claims.put("iat", now);
        claims.put("exp", now + ttlSeconds);
        String payload = base64Url(JsonUtil.toJsonStr(claims).getBytes(StandardCharsets.UTF_8));
        String signingInput = HEADER + "." + payload;
        String signature = base64Url(hmacSha256(signingInput.getBytes(StandardCharsets.UTF_8)));
        return signingInput + "." + signature;
    }

    public Map<String, Object> parse(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtException("empty token");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new JwtException("malformed token");
        }
        String signingInput = parts[0] + "." + parts[1];
        byte[] expectedSig = hmacSha256(signingInput.getBytes(StandardCharsets.UTF_8));
        byte[] actualSig = base64UrlDecode(parts[2]);
        if (!java.security.MessageDigest.isEqual(expectedSig, actualSig)) {
            throw new JwtException("bad signature");
        }
        Map<String, Object> claims = JsonUtil.parseObj(new String(base64UrlDecode(parts[1]), StandardCharsets.UTF_8));
        Number exp = (Number) claims.get("exp");
        if (exp != null && System.currentTimeMillis() / 1000 >= exp.longValue()) {
            throw new JwtException("token expired");
        }
        return claims;
    }

    public Long getUserId(String token) {
        Map<String, Object> claims = parse(token);
        Object uid = claims.get(CLAIM_USER_ID);
        if (uid instanceof Number n) return n.longValue();
        return null;
    }

    public String getType(String token) {
        return (String) parse(token).get(CLAIM_TYPE);
    }

    private byte[] hmacSha256(byte[] data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(key, HMAC_ALGO));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 failed", e);
        }
    }

    private static String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private static byte[] base64UrlDecode(String s) {
        return Base64.getUrlDecoder().decode(s);
    }

    public static class JwtException extends RuntimeException {
        public JwtException(String message) { super(message); }
    }
}
