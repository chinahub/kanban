package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.kanban.dto.AiUsageDto;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * AI token 消耗统计服务：对 ai_call_log 做聚合查询（总量、按功能来源、按天）。
 * 框架 QueryWrapper 不支持聚合列，这里参照 DataInitializer 走原生 JDBC。
 */
@Service
public class AiUsageService {

    @Autowired
    private DataSource dataSource;

    /**
     * 汇总 token 用量：全量合计、按 source 分组、近 30 天按天分组，一次查询组装为 AiUsageDto。
     */
    public AiUsageDto summarize() {
        long totalCalls = 0;
        long totalTokens = 0;
        long promptTokens = 0;
        long completionTokens = 0;
        List<AiUsageDto.SourceUsage> bySource = new ArrayList<>();
        List<AiUsageDto.DayUsage> byDay = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*), coalesce(sum(total_tokens),0), coalesce(sum(prompt_tokens),0),"
                            + " coalesce(sum(completion_tokens),0) FROM ai_call_log");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    totalCalls = rs.getLong(1);
                    totalTokens = rs.getLong(2);
                    promptTokens = rs.getLong(3);
                    completionTokens = rs.getLong(4);
                }
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT coalesce(source,'ai-assist'), count(*), coalesce(sum(total_tokens),0)"
                            + " FROM ai_call_log GROUP BY source ORDER BY 3 DESC");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    bySource.add(new AiUsageDto.SourceUsage(rs.getString(1), rs.getLong(2), rs.getLong(3)));
                }
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT to_char(created_at,'YYYY-MM-DD'), count(*), coalesce(sum(total_tokens),0)"
                            + " FROM ai_call_log WHERE created_at > now() - interval '30 days'"
                            + " GROUP BY 1 ORDER BY 1");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    byDay.add(new AiUsageDto.DayUsage(rs.getString(1), rs.getLong(2), rs.getLong(3)));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("AI 用量统计查询失败：" + e.getMessage(), e);
        }
        return new AiUsageDto(totalCalls, totalTokens, promptTokens, completionTokens, bySource, byDay);
    }
}
