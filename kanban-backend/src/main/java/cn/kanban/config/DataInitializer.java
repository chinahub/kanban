package cn.kanban.config;

import cn.kanban.entity.SysDict;
import cn.kanban.entity.SysDictData;
import cn.kanban.entity.User;
import cn.kanban.entity.Workspace;
import cn.kanban.entity.WorkspaceMember;
import cn.kanban.mapper.WorkspaceMemberMapper;
import cn.kanban.service.DictService;
import cn.kanban.service.UserService;
import cn.kanban.service.WorkspaceService;
import cn.jiebaba.summer.boot.ApplicationArguments;
import cn.jiebaba.summer.boot.ApplicationRunner;
import cn.jiebaba.summer.core.annotation.Component;
import cn.jiebaba.summer.core.annotation.Value;
import cn.jiebaba.summer.data.conditions.QueryWrapper;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.logging.Logger;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger LOG = Logger.getLogger(DataInitializer.class.getName());

    @Value("${kanban.bootstrap.enabled:true}")
    private boolean enabled;

    @Value("${kanban.bootstrap.admin.username:admin}")
    private String adminUser;

    @Value("${kanban.bootstrap.admin.password:admin123}")
    private String adminPassword;

    private final DataSource dataSource;
    private final UserService userService;
    private final WorkspaceService workspaceService;
    private final WorkspaceMemberMapper memberMapper;
    private final DictService dictService;

    public DataInitializer(DataSource dataSource,
                           UserService userService,
                           WorkspaceService workspaceService,
                           WorkspaceMemberMapper memberMapper,
                           DictService dictService) {
        this.dataSource = dataSource;
        this.userService = userService;
        this.workspaceService = workspaceService;
        this.memberMapper = memberMapper;
        this.dictService = dictService;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            LOG.info("kanban bootstrap disabled");
            return;
        }
        runSchemaIfNeeded();
        seedWorkspaces();
        seedAdmin();
        seedDicts();
        LOG.info("kanban bootstrap completed");
    }

    private void runSchemaIfNeeded() throws Exception {
        // schema.sql 全部为 CREATE TABLE/INDEX IF NOT EXISTS，幂等，每次启动都执行，
        // 以便在已初始化的库上增量补建新表（如 project_group/project）。
        StringBuilder sb = new StringBuilder();
        try (var is = DataInitializer.class.getResourceAsStream("/db/schema.sql");
             var reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("--")) continue;
                sb.append(line).append("\n");
            }
        }
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            for (String stmt : sb.toString().split(";")) {
                String s = stmt.trim();
                if (!s.isEmpty()) st.execute(s);
            }
        }
        LOG.info("schema ensured (idempotent)");
    }

    private void seedWorkspaces() {
        String[][] defaults = {
                {"dev", "Development", "\u5f00\u53d1\u73af\u5883"},
                {"test", "Staging / Test", "\u6d4b\u8bd5\u73af\u5883"},
                {"prod", "Production", "\u751f\u4ea7\u73af\u5883"}
        };
        for (String[] d : defaults) {
            if (workspaceService.findByCode(d[0]) == null) {
                Workspace w = new Workspace();
                w.code = d[0];
                w.name = d[1];
                w.description = d[2];
                w.isSystem = true;
                w.createdAt = new Timestamp(System.currentTimeMillis());
                w.updatedAt = w.createdAt;
                workspaceService.save(w);
                LOG.info("seeded workspace: " + d[0]);
            }
        }
    }

    private void seedAdmin() {
        User admin = userService.findByUsername(adminUser);
        if (admin == null) {
            admin = userService.create(adminUser, adminPassword, "Platform Admin", true);
            LOG.info("seeded admin user: " + adminUser);
        }
        List<Workspace> all = workspaceService.listAll();
        for (Workspace w : all) {
            Long count = memberMapper.selectCount(new QueryWrapper<WorkspaceMember>()
                    .eq("workspace_id", w.id)
                    .eq("user_id", admin.id));
            if (count == null || count == 0) {
                WorkspaceMember m = new WorkspaceMember();
                m.workspaceId = w.id;
                m.userId = admin.id;
                m.role = "OWNER";
                m.joinedAt = new Timestamp(System.currentTimeMillis());
                memberMapper.insert(m);
            }
        }
    }

    /**
     * seed 内置数据字典（4 组 P0 字典，isSystem=true 禁删）。
     * 类型按 dictType 判空、字典项按 (dict_type, value) 判空，全部幂等；
     * value/label/ext_json 与前端历史硬编码保持一致（渐进增强策略的兜底来源）。
     */
    private void seedDicts() {
        // {dictType, name, sortOrder}
        String[][] dicts = {
                {"project_status", "\u770b\u677f\u72b6\u6001", "1"},
                {"project_type", "\u770b\u677f\u7c7b\u578b", "2"},
                {"data_source_type", "\u6570\u636e\u6e90\u7c7b\u578b", "3"},
                {"status_card_status", "\u72b6\u6001\u5361\u7247\u72b6\u6001", "4"}
        };
        // {dictType, value, label, extJson}（按业务页面的真实展示文案与颜色）
        String[][] items = {
                {"project_status", "DRAFT", "\u8349\u7a3f", "{\"color\":\"default\"}"},
                {"project_status", "PUBLISHED", "\u5df2\u53d1\u5e03", "{\"color\":\"green\"}"},
                {"project_status", "TRASHED", "\u5df2\u56de\u6536", "{\"color\":\"red\"}"},
                {"project_type", "PC", "PC \u5927\u5c4f", "{}"},
                {"project_type", "MOBILE", "\u79fb\u52a8\u7aef", "{}"},
                {"project_type", "CITY3D", "\u4e09\u7ef4\u57ce\u5e02", "{\"disabled\":true}"},
                {"data_source_type", "api", "API\uff08HTTP\uff09", "{}"},
                {"data_source_type", "static", "\u9759\u6001 JSON", "{}"},
                {"data_source_type", "mysql", "MySQL", "{\"defaultPort\":3306}"},
                {"data_source_type", "postgres", "PostgreSQL", "{\"defaultPort\":5432}"},
                {"status_card_status", "online", "\u6b63\u5e38\uff08\u7eff\uff09", "{\"color\":\"#52c41a\"}"},
                {"status_card_status", "warning", "\u544a\u8b66\uff08\u9ec4\uff09", "{\"color\":\"#faad14\"}"},
                {"status_card_status", "offline", "\u79bb\u7ebf\uff08\u7ea2\uff09", "{\"color\":\"#ff4d4f\"}"}
        };
        for (String[] d : dicts) {
            if (findDictByType(d[0]) == null) {
                SysDict dict = new SysDict();
                dict.dictType = d[0];
                dict.name = d[1];
                dict.isSystem = true;
                dict.sortOrder = Integer.parseInt(d[2]);
                dict.createdAt = new Timestamp(System.currentTimeMillis());
                dict.updatedAt = dict.createdAt;
                dictService.createSeedDict(dict);
                LOG.info("seeded dict: " + d[0]);
            }
        }
        for (String[] i : items) {
            if (findItemByValue(i[0], i[1]) == null) {
                SysDictData item = new SysDictData();
                item.dictType = i[0];
                item.value = i[1];
                item.label = i[2];
                item.extJson = i[3];
                item.sortOrder = 0;
                item.enabled = true;
                item.createdAt = new Timestamp(System.currentTimeMillis());
                item.updatedAt = item.createdAt;
                dictService.createSeedItem(item);
                LOG.info("seeded dict item: " + i[0] + "." + i[1]);
            }
        }
    }

    /** 按 dictType 查找字典类型（幂等判断用）。 */
    private SysDict findDictByType(String dictType) {
        return dictService.listDicts().stream()
                .filter(d -> dictType.equals(d.dictType))
                .findFirst().orElse(null);
    }

    /** 按 (dictType, value) 查找字典项（幂等判断用）。 */
    private SysDictData findItemByValue(String dictType, String value) {
        return dictService.listItems().stream()
                .filter(i -> dictType.equals(i.dictType) && value.equals(i.value))
                .findFirst().orElse(null);
    }
}
