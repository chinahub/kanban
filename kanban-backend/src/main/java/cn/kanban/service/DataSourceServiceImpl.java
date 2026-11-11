package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.util.JsonUtil;
import cn.jiebaba.summer.core.util.JsonUtil.JSONArray;
import cn.jiebaba.summer.core.util.JsonUtil.JSONObject;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.DataSource;
import cn.kanban.mapper.DataSourceMapper;
import cn.kanban.util.CryptoUtil;
import cn.kanban.util.DbConnectionPool;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class DataSourceServiceImpl extends ServiceImpl<DataSourceMapper, DataSource> implements DataSourceService {

    private static final Set<String> ALLOWED_TYPES = Set.of("static", "api", "mysql", "postgres");
    private static final Set<String> DB_TYPES = Set.of("mysql", "postgres");

    /** 驱动类名固定映射（键为 DB_TYPES 白名单内的类型） */
    private static final Map<String, String> DRIVERS = Map.of(
            "mysql", "com.mysql.cj.jdbc.Driver",
            "postgres", "org.postgresql.Driver"
    );

    /**
     * 只读守卫：数据源 SQL 由看板作者整条编写（PRD §4.6.2），限制为单条 SELECT——
     * 去除行注释/块注释后须以 SELECT 开头，且除结尾分号外不允许出现分号（防多语句）。
     */
    private static void validateReadOnlyQuery(String query) {
        String q = query.replaceAll("--[^\\n]*", " ").replaceAll("/\\*[\\s\\S]*?\\*/", " ").trim();
        if (!q.regionMatches(true, 0, "select", 0, 6)) {
            throw new IllegalArgumentException("仅支持单条 SELECT 查询");
        }
        int semi = q.indexOf(';');
        if (semi >= 0 && semi != q.length() - 1) {
            throw new IllegalArgumentException("不支持多条语句");
        }
    }

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Autowired
    public void setMapper(DataSourceMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<DataSource> listByWorkspace(Long wsId) {
        if (wsId == null) return List.of();
        return list(new QueryWrapper<DataSource>().eq("workspace_id", wsId).orderByDesc("updated_at"));
    }

    @Override
    public DataSource findById(Long id, Long wsId) {
        if (id == null) return null;
        DataSource ds = getById(id);
        if (ds != null && wsId != null && !wsId.equals(ds.workspaceId)) return null;
        return ds;
    }

    @Override
    public DataSource create(Long wsId, Long creatorId, String name, String type, String config) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        String t = type == null ? "" : type.trim();
        if (!ALLOWED_TYPES.contains(t)) throw new IllegalArgumentException("type must be one of " + ALLOWED_TYPES);
        if (config == null || config.isBlank()) throw new IllegalArgumentException("config is required");
        DataSource ds = new DataSource();
        ds.workspaceId = wsId;
        ds.creatorId = creatorId;
        ds.name = name.trim();
        ds.type = t;
        ds.config = DB_TYPES.contains(t) ? processDbConfig(config, null) : config;
        Timestamp now = new Timestamp(System.currentTimeMillis());
        ds.createdAt = now;
        ds.updatedAt = now;
        save(ds);
        return ds;
    }

    @Override
    public DataSource update(Long id, Long wsId, String name, String type, String config) {
        DataSource ds = findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data source not found");
        if (name != null) {
            if (name.isBlank()) throw new IllegalArgumentException("name must not be blank");
            ds.name = name.trim();
        }
        if (type != null) {
            String t = type.trim();
            if (!ALLOWED_TYPES.contains(t)) throw new IllegalArgumentException("type must be one of " + ALLOWED_TYPES);
            ds.type = t;
        }
        if (config != null) {
            if (DB_TYPES.contains(ds.type)) {
                String existingEnc = null;
                try {
                    existingEnc = JsonUtil.parseObj(ds.config).getStr("passwordEnc");
                } catch (Exception ignored) {
                    // 旧配置无 passwordEnc
                }
                ds.config = processDbConfig(config, existingEnc);
            } else {
                ds.config = config;
            }
        }
        ds.updatedAt = new Timestamp(System.currentTimeMillis());
        updateById(ds);
        // 配置可能已变更（host/密码等），连接池指纹失配时会在下次借出时自动换池
        DbConnectionPool.evict(id);
        return ds;
    }

    @Override
    public void delete(Long id, Long wsId) {
        DataSource ds = findById(id, wsId);
        if (ds == null) throw new NoSuchElementException("data source not found");
        removeById(id);
        DbConnectionPool.evict(id);
    }

    @Override
    public JSONArray fetchArray(Long id, Long wsId) {
        DataSource src = findById(id, wsId);
        if (src == null) throw new NoSuchElementException("data source not found");
        JSONObject cfg = JsonUtil.parseObj(src.config);
        if ("static".equals(src.type)) {
            JSONArray arr = cfg.getJSONArray("data");
            if (arr == null) throw new IllegalStateException("static source missing 'data' array");
            return arr;
        }
        if ("api".equals(src.type)) {
            return fetchApi(cfg);
        }
        if (DB_TYPES.contains(src.type)) {
            return fetchDb(id, src.type, cfg);
        }
        throw new IllegalStateException("unsupported source type: " + src.type);
    }

    private JSONArray fetchApi(JSONObject srcCfg) {
        String url = srcCfg.getStr("url");
        if (url == null || url.isBlank()) throw new IllegalStateException("api source missing 'url'");
        String method = srcCfg.getStr("method");
        if (method == null || method.isBlank()) method = "GET";

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10));
        if ("GET".equalsIgnoreCase(method)) {
            builder.GET();
        } else {
            builder.method(method.toUpperCase(), HttpRequest.BodyPublishers.noBody());
        }
        JSONObject headers = srcCfg.getJSONObject("headers");
        if (headers != null) {
            for (Map.Entry<String, Object> e : headers.entrySet()) {
                if (e.getValue() != null) builder.header(e.getKey(), e.getValue().toString());
            }
        }

        try {
            HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                throw new RuntimeException("api responded " + resp.statusCode());
            }
            JSONObject body = JsonUtil.parseObj(resp.body());
            String dataPath = srcCfg.getStr("dataPath");
            if (dataPath == null || dataPath.isBlank()) {
                if (body == null) throw new RuntimeException("api body parse failed");
                JSONArray arr = body.getJSONArray("data");
                if (arr != null) return arr;
                JSONArray wrap = new JSONArray();
                wrap.add(body);
                return wrap;
            }
            Object cur = body;
            for (String seg : dataPath.split("\\.")) {
                if (cur == null) return new JSONArray();
                if (cur instanceof JSONObject jo) cur = jo.get(seg);
                else return new JSONArray();
            }
            if (cur instanceof JSONArray ja) return ja;
            return new JSONArray();
        } catch (Exception e) {
            throw new RuntimeException("api fetch failed: " + e.getMessage(), e);
        }
    }

    private JSONArray fetchDb(long datasourceId, String type, JSONObject cfg) {
        String host = cfg.getStr("host");
        String port = cfg.getStr("port");
        String database = cfg.getStr("database");
        String username = cfg.getStr("username");
        String passwordEnc = cfg.getStr("passwordEnc");
        String query = cfg.getStr("query");
        if (host == null || host.isBlank()) throw new IllegalStateException("db source missing 'host'");
        if (query == null || query.isBlank()) throw new IllegalStateException("db source missing 'query'");
        validateReadOnlyQuery(query);
        String password = passwordEnc == null ? null : CryptoUtil.decrypt(passwordEnc);

        String url;
        if ("mysql".equals(type)) {
            url = "jdbc:mysql://" + host + ":" + (port == null || port.isBlank() ? "3306" : port)
                    + "/" + (database == null ? "" : database)
                    + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf8";
        } else {
            url = "jdbc:postgresql://" + host + ":" + (port == null || port.isBlank() ? "5432" : port)
                    + "/" + (database == null ? "" : database);
        }
        // 驱动类名固定映射，不使用外部输入做反射加载
        String driverClass = DRIVERS.get(type);
        if (driverClass == null) throw new IllegalStateException("unsupported db type: " + type);
        try {
            Class.forName(driverClass);
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("JDBC driver not found: " + driverClass, e);
        }
        JSONArray rows = new JSONArray();
        // 池内按配置指纹识别变更（host/密码等编辑后自动换池）
        String fingerprint = type + "|" + url + "|" + username + "|" + password;
        Connection conn = null;
        boolean broken = false;
        try {
            conn = DbConnectionPool.borrow(datasourceId, fingerprint, () -> {
                try {
                    return DriverManager.getConnection(url, username, password);
                } catch (SQLException e) {
                    throw new RuntimeException("db connect failed: " + e.getMessage(), e);
                }
            });
            try (Statement stmt = conn.createStatement()) {
                stmt.setMaxRows(1000);
                stmt.setQueryTimeout(15);
                try (ResultSet rs = stmt.executeQuery(query)) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int n = meta.getColumnCount();
                    while (rs.next()) {
                        JSONObject row = new JSONObject();
                        for (int i = 1; i <= n; i++) {
                            String col = meta.getColumnLabel(i);
                            if (col == null || col.isBlank()) col = meta.getColumnName(i);
                            row.put(col, convert(rs.getObject(i)));
                        }
                        rows.add(row);
                    }
                }
            }
        } catch (RuntimeException e) {
            broken = true;
            throw e;
        } catch (SQLException e) {
            broken = true;
            throw new RuntimeException("db query failed: " + e.getMessage(), e);
        } finally {
            // 归还连接池（异常/超时按 broken 关闭，不回坏连接）
            DbConnectionPool.release(datasourceId, conn, broken);
        }
        return rows;
    }

    private static Object convert(Object v) {
        if (v == null) return null;
        if (v instanceof Number || v instanceof Boolean) return v;
        return v.toString();
    }

    private String processDbConfig(String rawConfig, String existingEncrypted) {
        JSONObject cfg = JsonUtil.parseObj(rawConfig);
        JSONObject out = new JSONObject();
        out.putAll(cfg);
        out.remove("password");
        String pwd = cfg.getStr("password");
        if (pwd != null && !pwd.isBlank()) {
            out.put("passwordEnc", CryptoUtil.encrypt(pwd));
        } else if (existingEncrypted != null && !existingEncrypted.isBlank()) {
            out.put("passwordEnc", existingEncrypted);
        }
        return JsonUtil.toJsonStr(out);
    }
}
