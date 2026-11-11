package cn.kanban.util;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * 用户配置数据源（MySQL/PostgreSQL）的轻量连接池（PRD §8.3「每次 fetch 新建连接」限制的收口）。
 *
 * 设计：按数据源 id 建池；池内记录配置指纹（type|url|user|password 的哈希），指纹变化（编辑/改密）
 * 即清空旧空闲连接重建，因此 update 无需显式失效；delete 调 {@link #evict} 直接摘池。
 * 借出时逐个 isValid 校验剔除死连；并发超过 {@link #MAX_TOTAL} 不等待、直接抛错（看板自动刷新为秒级低频，足够）。
 * 仅进程内使用，密码指纹存内存；JVM 关闭钩子统一回收空闲连接。
 */
public final class DbConnectionPool {

    private static final Logger LOG = Logger.getLogger(DbConnectionPool.class.getName());

    /** 单数据源最大并发连接数（借出 + 空闲），超出直接抛错不排队 */
    private static final int MAX_TOTAL = 8;
    /** 单数据源最大空闲 kept 连接数 */
    private static final int MAX_IDLE = 4;
    /** 池总数上限，超出时清理无占用的空池 */
    private static final int MAX_POOLS = 64;
    /** 借出校验超时（秒） */
    private static final int VALIDATE_TIMEOUT_SEC = 2;

    private static final Map<Long, Entry> POOLS = new ConcurrentHashMap<>();

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(DbConnectionPool::closeAll));
    }

    private DbConnectionPool() {
    }

    /** 单数据源连接池条目：配置指纹 + 空闲连接 + 计数（对 entry 对象加锁串行化） */
    private static final class Entry {
        volatile String fingerprint;
        /** evict 后置位：在用连接归还时直接关闭，不再入池 */
        volatile boolean closed;
        final ArrayDeque<Connection> idle = new ArrayDeque<>();
        int total;
        int inUse;
    }

    /**
     * 借出一个连接：指纹不符先换池；空闲连接逐个校验取第一个可用者；
     * 无可用且未达上限则经 opener 新建；达上限抛错（不阻塞）。
     */
    public static Connection borrow(long datasourceId, String fingerprint, ConnectionOpener opener) {
        Entry entry = entryOf(datasourceId, fingerprint);
        synchronized (entry) {
            if (!java.util.Objects.equals(entry.fingerprint, fingerprint)) {
                // 配置已变更：关闭全部空闲连接，在用连接归还时按计数正常回收
                closeIdle(entry);
                entry.total = entry.inUse;
                entry.fingerprint = fingerprint;
            }
            Connection c;
            while ((c = entry.idle.poll()) != null) {
                try {
                    if (c.isValid(VALIDATE_TIMEOUT_SEC)) {
                        entry.inUse++;
                        LOG.fine("dbpool: reuse connection ds=" + datasourceId + " idle=" + entry.idle.size());
                        return c;
                    }
                } catch (SQLException e) {
                    // 校验异常按死连处理
                }
                closeQuietly(c);
                entry.total--;
            }
            if (entry.total >= MAX_TOTAL) {
                throw new RuntimeException("数据源并发连接已达上限 " + MAX_TOTAL + "（ds=" + datasourceId + "）");
            }
            c = opener.open();
            entry.total++;
            entry.inUse++;
            LOG.fine("dbpool: new connection ds=" + datasourceId + " total=" + entry.total);
            return c;
        }
    }

    /**
     * 归还连接：broken 或校验失败直接关闭；空闲池未满则入池复用，否则关闭。
     */
    public static void release(long datasourceId, Connection conn, boolean broken) {
        if (conn == null) return;
        Entry entry = POOLS.get(datasourceId);
        if (entry == null) {
            closeQuietly(conn);
            return;
        }
        synchronized (entry) {
            entry.inUse = Math.max(0, entry.inUse - 1);
            // 条目已被 evict（数据源删除）：直接关闭，不入池
            if (entry.closed) {
                closeQuietly(conn);
                entry.total--;
                return;
            }
            if (broken) {
                closeQuietly(conn);
                entry.total--;
                return;
            }
            try {
                if (!conn.isValid(VALIDATE_TIMEOUT_SEC)) {
                    closeQuietly(conn);
                    entry.total--;
                    return;
                }
            } catch (SQLException e) {
                closeQuietly(conn);
                entry.total--;
                return;
            }
            if (entry.idle.size() < MAX_IDLE) {
                entry.idle.offer(conn);
            } else {
                closeQuietly(conn);
                entry.total--;
            }
        }
    }

    /** 数据源被删除时摘除整池（关闭全部空闲连接并关闭条目；在用连接由 release 兜底关闭） */
    public static void evict(long datasourceId) {
        Entry entry = POOLS.remove(datasourceId);
        if (entry != null) {
            synchronized (entry) {
                entry.closed = true;
                closeIdle(entry);
            }
        }
    }

    private static Entry entryOf(long datasourceId, String fingerprint) {
        pruneEmptyPools();
        return POOLS.computeIfAbsent(datasourceId, k -> {
            Entry e = new Entry();
            e.fingerprint = fingerprint;
            return e;
        });
    }

    /** 池总数超限时清理既无空闲也无占用的条目，避免长期运行内存缓涨 */
    private static void pruneEmptyPools() {
        if (POOLS.size() <= MAX_POOLS) return;
        POOLS.entrySet().removeIf(e -> {
            Entry entry = e.getValue();
            synchronized (entry) {
                return entry.idle.isEmpty() && entry.inUse <= 0;
            }
        });
    }

    private static void closeIdle(Entry entry) {
        Connection c;
        while ((c = entry.idle.poll()) != null) {
            closeQuietly(c);
        }
        entry.total = 0;
    }

    private static void closeQuietly(Connection c) {
        try {
            c.close();
        } catch (Exception e) {
            // 关闭失败忽略（连接已死）
        }
    }

    private static void closeAll() {
        for (Map.Entry<Long, Entry> e : POOLS.entrySet()) {
            synchronized (e.getValue()) {
                closeIdle(e.getValue());
            }
        }
        POOLS.clear();
    }

    /** 建连函数：由调用方提供（内含 DriverManager.getConnection 与驱动细节） */
    @FunctionalInterface
    public interface ConnectionOpener {
        Connection open();
    }
}
