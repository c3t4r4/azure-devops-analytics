using DashboardDevops.Domain.Models;

namespace DashboardDevops.Domain.Interfaces;

public interface IAzureDevOpsService
{
    // Projects
    Task<IEnumerable<AzureProject>> GetProjectsAsync(string orgName, string patToken, CancellationToken ct = default);
    Task<IEnumerable<ProjectWithDetails>> GetProjectsWithDetailsAsync(string orgName, string patToken, CancellationToken ct = default);

    // Pipelines / Builds
    Task<IEnumerable<AzurePipeline>> GetPipelinesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);

    // Releases
    Task<IEnumerable<AzureRelease>> GetReleasesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);

    // Work Items
    Task<IEnumerable<AzureWorkItem>> GetWorkItemsAsync(string orgName, string projectId, string patToken, int maxItems = 200, CancellationToken ct = default);

    // Repositories
    Task<IEnumerable<AzureRepository>> GetRepositoriesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);

    // Teams
    Task<IEnumerable<AzureTeam>> GetTeamsAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);
    Task<IEnumerable<AzureTeamMember>> GetTeamMembersAsync(string orgName, string projectId, string teamId, string patToken, CancellationToken ct = default);

    // Sprints
    Task<IEnumerable<AzureSprint>> GetSprintsAsync(string orgName, string projectId, string teamId, string patToken, bool includeWorkItemCounts = false, CancellationToken ct = default);
    Task<IEnumerable<AzureWorkItem>> GetSprintWorkItemsAsync(string orgName, string projectId, string teamId, string iterationId, string patToken, CancellationToken ct = default);

    // Wiki
    Task<IEnumerable<AzureWiki>> GetWikisAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);
    Task<IEnumerable<AzureWikiPage>> GetWikiPagesAsync(string orgName, string wikiId, string patToken, CancellationToken ct = default);

    // Task Groups
    Task<IEnumerable<AzureTaskGroup>> GetTaskGroupsAsync(string orgName, string projectId, string patToken, CancellationToken ct = default);

    // Packaging / Artifacts
    Task<IEnumerable<AzurePackageFeed>> GetPackageFeedsAsync(string orgName, string patToken, CancellationToken ct = default);
    Task<IEnumerable<AzurePackage>> GetFeedPackagesAsync(string orgName, string feedId, string patToken, CancellationToken ct = default);

    // Member Entitlements
    Task<IEnumerable<AzureMemberEntitlement>> GetMemberEntitlementsAsync(string orgName, string patToken, CancellationToken ct = default);

    // Analytics
    Task<UserActivityRanking> GetUserActivityRankingAsync(string orgName, string patToken, int days, CancellationToken ct = default);
    Task<ProjectPriorityReport> GetProjectPriorityAsync(string orgName, string patToken, int days, CancellationToken ct = default);

    // Dashboard
    Task<DashboardSummary> GetDashboardSummaryAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default);

    // Timeline
    Task<TimelineResponse> GetTimelineAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default);

    // Today Updates
    Task<TodayUpdatesResponse> GetTodayUpdatesAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default);
}
