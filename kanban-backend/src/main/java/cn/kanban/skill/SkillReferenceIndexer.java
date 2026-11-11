package cn.kanban.skill;

import cn.jiebaba.summer.ai.document.Document;
import cn.jiebaba.summer.ai.document.TokenTextSplitter;
import cn.jiebaba.summer.ai.vectorstore.VectorStore;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.core.context.ApplicationContext;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * 技能参考文档入库器：把各技能 references/ 下的 Markdown 切块、向量化后写入 pgvector。
 * <p>幂等：chunk id 取 {@code 技能/相对路径#块序号}（确定性），JdbcVectorStore 按 id upsert，
 * 重复 reindex 不产生重复数据；向量库按 {@code metadata.skill} 打标签供检索过滤。</p>
 * <p>由管理端点手动触发（分钟级耗时），不在启动时自动执行，避免拖慢应用启动。</p>
 */
@Service
public class SkillReferenceIndexer {

    private static final Logger LOG = Logger.getLogger(SkillReferenceIndexer.class.getName());

    /** 每批 upsert 的文档数：一次 add 对应一次批量向量化与一条多值 SQL。 */
    private static final int BATCH_SIZE = 64;

    private final SkillRegistry skillRegistry;
    private final ApplicationContext context;

    public SkillReferenceIndexer(SkillRegistry skillRegistry, ApplicationContext context) {
        this.skillRegistry = skillRegistry;
        this.context = context;
    }

    /**
     * 全量重建技能参考文档索引，返回入库 chunk 总数。
     * 向量库未就绪（embedding 资产缺失、未配置 pgvector）时抛出 IllegalStateException。
     */
    public int reindex() {
        VectorStore vectorStore;
        try {
            vectorStore = context.getBean(VectorStore.class);
        } catch (RuntimeException e) {
            throw new IllegalStateException("向量库未就绪：" + e.getMessage(), e);
        }
        TokenTextSplitter splitter = new TokenTextSplitter(600, 80);
        int total = 0;
        for (String skill : skillRegistry.names()) {
            List<String> paths = skillRegistry.referencePaths(skill);
            if (paths.isEmpty()) {
                continue;
            }
            List<Document> batch = new ArrayList<>(BATCH_SIZE);
            int skillCount = 0;
            for (String rel : paths) {
                String text = skillRegistry.readReference(skill, rel);
                if (text == null || text.isBlank()) {
                    continue;
                }
                List<String> chunks = splitter.split(text);
                for (int i = 0; i < chunks.size(); i++) {
                    batch.add(Document.builder()
                            .id(skill + "/" + rel + "#" + i)
                            .content(chunks.get(i))
                            .metadata("skill", skill)
                            .metadata("source", skill + "/" + rel)
                            .build());
                    if (batch.size() >= BATCH_SIZE) {
                        vectorStore.add(batch);
                        skillCount += batch.size();
                        batch.clear();
                    }
                }
            }
            if (!batch.isEmpty()) {
                vectorStore.add(batch);
                skillCount += batch.size();
            }
            total += skillCount;
            LOG.info("技能 " + skill + " 参考文档入库完成：" + skillCount + " chunks");
        }
        LOG.info("技能参考文档全部入库完成，总计 " + total + " chunks");
        return total;
    }
}
