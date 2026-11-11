package cn.kanban.skill;

import cn.jiebaba.summer.core.annotation.PostConstruct;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.annotation.Value;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

/**
 * 技能注册表：启动时从 classpath 加载 AntV 可视化技能包。
 * 技能目录结构（Claude Code skills 格式）：
 * <pre>
 * {kanban.skills.dir}/
 *   skills.index                 # 全部技能目录名，每行一个（jar 内无法列目录，故显式索引）
 *   &lt;skill&gt;/SKILL.md           # frontmatter(name/description) + 指令正文
 *   &lt;skill&gt;/references.index   # 该技能 references/ 下所有 md 的相对路径，每行一个（可无）
 *   &lt;skill&gt;/references/**.md   # 参考文档，供 RAG 入库
 * </pre>
 * 指令正文原样提供给模型（无模板变量），references 由 {@link SkillReferenceIndexer} 入向量库。
 */
@Service
public class SkillRegistry {

    private static final Logger LOG = Logger.getLogger(SkillRegistry.class.getName());

    @Value("${kanban.skills.dir:skills/visualization-skills/skills}")
    private String skillsDir;

    /** 技能名 → frontmatter 元信息（有序，保持 skills.index 顺序）。 */
    private final Map<String, SkillInfo> infos = new LinkedHashMap<>();
    /** 技能名 → SKILL.md 指令正文（frontmatter 之后的全文）。 */
    private final Map<String, String> bodies = new LinkedHashMap<>();
    /** 技能名 → references 相对路径列表（如 references/marks/xxx.md）。 */
    private final Map<String, List<String>> references = new LinkedHashMap<>();

    @PostConstruct
    public void load() {
        String indexText = readResource(skillsDir + "/skills.index");
        if (indexText == null) {
            LOG.warning("技能索引未找到：" + skillsDir + "/skills.index，技能对话不可用");
            return;
        }
        for (String raw : indexText.split("\n")) {
            String name = raw.trim();
            if (name.isEmpty() || name.startsWith("#")) {
                continue;
            }
            String skillMd = readResource(skillsDir + "/" + name + "/SKILL.md");
            if (skillMd == null) {
                LOG.warning("技能 SKILL.md 缺失，已跳过：" + name);
                continue;
            }
            infos.put(name, parseFrontmatter(name, skillMd));
            bodies.put(name, stripFrontmatter(skillMd));
            references.put(name, readReferenceIndex(name));
        }
        LOG.info("已加载技能 " + infos.size() + " 个：" + String.join(", ", infos.keySet()));
    }

    /** 全部技能元信息（按 skills.index 顺序），供模型挑选技能。 */
    public List<SkillInfo> index() {
        return List.copyOf(infos.values());
    }

    /** 技能指令正文；不存在返回 null。 */
    public String body(String name) {
        return bodies.get(name);
    }

    /** 全部技能名。 */
    public Set<String> names() {
        return infos.keySet();
    }

    /** 某技能的 references 相对路径列表；无 references 返回空表。 */
    public List<String> referencePaths(String name) {
        return references.getOrDefault(name, List.of());
    }

    /** 读取某技能某个 reference 的文本内容；不存在返回 null。 */
    public String readReference(String skill, String relativePath) {
        return readResource(skillsDir + "/" + skill + "/" + relativePath);
    }

    /** 读取技能的 references.index；不存在返回空表。 */
    private List<String> readReferenceIndex(String name) {
        String text = readResource(skillsDir + "/" + name + "/references.index");
        List<String> out = new ArrayList<>();
        if (text == null) {
            return out;
        }
        for (String raw : text.split("\n")) {
            String line = raw.trim();
            if (!line.isEmpty() && !line.startsWith("#")) {
                out.add(line);
            }
        }
        return out;
    }

    /**
     * 解析 SKILL.md 的 YAML frontmatter：仅取 name/description 两个键，
     * 按首个冒号切分（description 中可能含冒号），忽略其余键（如 x6 的 version）。
     */
    private SkillInfo parseFrontmatter(String dirName, String skillMd) {
        String name = dirName;
        String description = "";
        String[] lines = skillMd.split("\n");
        if (lines.length > 0 && lines[0].trim().equals("---")) {
            for (int i = 1; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.equals("---")) {
                    break;
                }
                int colon = line.indexOf(':');
                if (colon <= 0) {
                    continue;
                }
                String key = line.substring(0, colon).trim();
                String value = line.substring(colon + 1).trim();
                if ("name".equals(key)) {
                    name = value;
                } else if ("description".equals(key)) {
                    description = value;
                }
            }
        }
        return new SkillInfo(name, description);
    }

    /** 去掉 SKILL.md 的 frontmatter，返回指令正文。 */
    private String stripFrontmatter(String skillMd) {
        String[] lines = skillMd.split("\n", -1);
        if (lines.length > 0 && lines[0].trim().equals("---")) {
            for (int i = 1; i < lines.length; i++) {
                if (lines[i].trim().equals("---")) {
                    String body = String.join("\n", java.util.Arrays.copyOfRange(lines, i + 1, lines.length));
                    return body.strip();
                }
            }
        }
        return skillMd.strip();
    }

    /** 读取 classpath 文本资源（UTF-8）；不存在返回 null。 */
    private String readResource(String path) {
        try (InputStream is = SkillRegistry.class.getResourceAsStream("/" + path)) {
            if (is == null) {
                return null;
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            LOG.warning("读取资源失败 " + path + "：" + e.getMessage());
            return null;
        }
    }
}
