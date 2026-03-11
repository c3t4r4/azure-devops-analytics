using DashboardDevops.Domain.Models;

namespace DashboardDevops.Domain.Interfaces;

public interface IDashboardCacheService
{
    Task<(DashboardSummary? Summary, string? Hash)> GetSummaryAsync(CancellationToken ct = default);
    Task<(TimelineResponse? Timeline, string? Hash)> GetTimelineAsync(CancellationToken ct = default);
    Task<(TodayUpdatesResponse? TodayUpdates, string? Hash)> GetTodayUpdatesAsync(CancellationToken ct = default);

    /// <summary>Atualiza o cache a partir do Azure DevOps. Só grava se o conteúdo tiver mudado (hash diferente).</summary>
    Task RefreshFromAzureAsync(CancellationToken ct = default);
}
