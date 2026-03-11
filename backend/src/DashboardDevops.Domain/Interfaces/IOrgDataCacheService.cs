using DashboardDevops.Domain.Models;

namespace DashboardDevops.Domain.Interfaces;

/// <summary>Cache de dados por organização. API sempre lê daqui; worker popula. Nunca chama Azure.</summary>
public interface IOrgDataCacheService
{
    Task<IEnumerable<AzureProject>?> GetProjectsAsync(string orgName, CancellationToken ct = default);
    Task<IEnumerable<ProjectWithDetails>?> GetProjectsWithDetailsAsync(string orgName, CancellationToken ct = default);
    Task<IEnumerable<AzurePipeline>?> GetPipelinesAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzureRelease>?> GetReleasesAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzureWorkItem>?> GetWorkItemsAsync(string orgName, string projectId, int max = 5000, CancellationToken ct = default);
    Task<IEnumerable<AzureTeam>?> GetTeamsAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzureSprint>?> GetSprintsAsync(string orgName, string projectId, string teamId, bool includeCounts, CancellationToken ct = default);
    Task<IEnumerable<AzureRepository>?> GetRepositoriesAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzureWiki>?> GetWikisAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzureWikiPage>?> GetWikiPagesAsync(string orgName, string wikiId, CancellationToken ct = default);
    Task<IEnumerable<AzureTaskGroup>?> GetTaskGroupsAsync(string orgName, string projectId, CancellationToken ct = default);
    Task<IEnumerable<AzurePackageFeed>?> GetPackageFeedsAsync(string orgName, CancellationToken ct = default);
    Task<IEnumerable<AzurePackage>?> GetFeedPackagesAsync(string orgName, string feedId, CancellationToken ct = default);

    /// <summary>Atualiza o cache de uma organização a partir do Azure. Chamado pelo worker.</summary>
    Task RefreshOrganizationAsync(string orgName, string patToken, CancellationToken ct = default);

    /// <summary>Atualiza o cache de todas as organizações ativas. Chamado pelo worker a cada 1 min.</summary>
    Task RefreshAllOrganizationsAsync(CancellationToken ct = default);
}
