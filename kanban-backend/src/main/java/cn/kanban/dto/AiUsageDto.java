package cn.kanban.dto;

import java.util.List;

/**
 * AI token 消耗统计（GET /api/ai/usage 响应）。
 * 汇总自 ai_call_log：总量、按功能来源（ladv/ai-assist/skill-chat）、按天（近 30 天）。
 */
public record AiUsageDto(long totalCalls, long totalTokens, long promptTokens, long completionTokens,
                         List<SourceUsage> bySource, List<DayUsage> byDay) {

    /** 按功能来源聚合的用量。 */
    public record SourceUsage(String source, long calls, long totalTokens) {
    }

    /** 按天聚合的用量（day 形如 2024-01-01）。 */
    public record DayUsage(String day, long calls, long totalTokens) {
    }
}
