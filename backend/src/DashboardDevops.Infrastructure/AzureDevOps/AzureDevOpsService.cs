using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Domain.Models;
using DashboardDevops.Infrastructure.AzureDevOps.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DashboardDevops.Infrastructure.AzureDevOps;

public class AzureDevOpsService(
    IHttpClientFactory httpClientFactory,
    ICacheService cache,
    ILogger<AzureDevOpsService> logger,
    IConfiguration configuration)
    : IAzureDevOpsService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static readonly TimeSpan ShortTtl = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan MediumTtl = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan LongTtl = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan DayTtl = TimeSpan.FromHours(1);

    private string ApiVersion => configuration["AzureDevOps:ApiVersion"] ?? "7.1";

    private static string Encode(string segment) => Uri.EscapeDataString(segment);

    private static bool IsCompletedState(string? state)
    {
        if (string.IsNullOrEmpty(state)) return false;
        var s = state.Trim();
        return s.Equals("Done", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Closed", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Resolved", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Concluído", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Concluido", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Completed", StringComparison.OrdinalIgnoreCase)
            || s.Equals("Completado", StringComparison.OrdinalIgnoreCase);
    }
    private static string OrgUrl(string org) => $"https://dev.azure.com/{Encode(org)}";
    private static string ProjUrl(string org, string proj) => $"https://dev.azure.com/{Encode(org)}/{Encode(proj)}";
    private static string VsrmUrl(string org, string proj) => $"https://vsrm.dev.azure.com/{Encode(org)}/{Encode(proj)}";
    private static string FeedUrl(string org) => $"https://feeds.dev.azure.com/{Encode(org)}";
    private static string VsspsUrl(string org) => $"https://vsaex.dev.azure.com/{Encode(org)}";

    // ─── Projects ────────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureProject>> GetProjectsAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:projects";
        var cached = await cache.GetAsync<List<AzureProject>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{OrgUrl(orgName)}/_apis/projects?api-version={ApiVersion}&$top=200";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureProjectApi>>(body);
        var projects = result?.Value.Select(p => new AzureProject(
            p.Id, p.Name, p.Description, p.State, p.Visibility, p.LastUpdateTime, p.Url
        )).ToList() ?? [];

        await cache.SetAsync(key, projects, LongTtl, ct);
        return projects;
    }

    public async Task<IEnumerable<ProjectWithDetails>> GetProjectsWithDetailsAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        var projects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
        var result = new List<ProjectWithDetails>();

        foreach (var project in projects)
        {
            string? currentSprintName = null;
            int completedCount = 0, incompleteCount = 0;
            DateTime? lastWorkItemUpdate = null;

            try
            {
                var teams = (await GetTeamsAsync(orgName, project.Id, patToken, ct)).Take(5);
                foreach (var team in teams)
                {
                    var sprints = (await GetSprintsAsync(orgName, project.Id, team.Id, patToken, true, ct)).ToList();
                    var current = sprints.FirstOrDefault(s => string.Equals(s.Status, "current", StringComparison.OrdinalIgnoreCase));
                    if (current is not null)
                    {
                        currentSprintName ??= current.Name;
                        completedCount += current.CompletedCount ?? 0;
                        incompleteCount += current.IncompleteCount ?? 0;
                    }
                }

                var workItems = (await GetWorkItemsAsync(orgName, project.Id, patToken, 1, ct)).ToList();
                lastWorkItemUpdate = workItems.FirstOrDefault()?.ChangedDate;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error enriching project {ProjectId} in {OrgName}", project.Id, orgName);
            }

            var projectStartDate = await GetOldestWorkItemDateAsync(orgName, project.Id, patToken, ct);

            result.Add(new ProjectWithDetails(
                project.Id,
                project.Name,
                project.Description,
                project.State,
                project.Visibility,
                project.LastUpdateTime,
                project.Url,
                currentSprintName,
                completedCount,
                incompleteCount,
                lastWorkItemUpdate,
                projectStartDate
            ));
        }

        return result.OrderByDescending(p => p.LastWorkItemUpdate ?? DateTime.MinValue).ToList();
    }

    // ─── Pipelines / Builds ──────────────────────────────────────────────────
    public async Task<IEnumerable<AzurePipeline>> GetPipelinesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:pipelines";
        var cached = await cache.GetAsync<List<AzurePipeline>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{ProjUrl(orgName, projectId)}/_apis/build/builds?api-version={ApiVersion}&$top=50&queryOrder=queueTimeDescending";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureBuildApi>>(body);
        var pipelines = result?.Value.Select(b => new AzurePipeline(
            b.Id,
            b.Definition?.Name ?? b.BuildNumber,
            b.Status ?? "unknown",
            b.Result ?? "none",
            b.SourceBranch,
            b.StartTime,
            b.FinishTime,
            b.RequestedBy?.DisplayName,
            projectId,
            b.Links?.Web?.Href
        )).ToList() ?? [];

        await cache.SetAsync(key, pipelines, ShortTtl, ct);
        return pipelines;
    }

    // ─── Releases ────────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureRelease>> GetReleasesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:releases";
        var cached = await cache.GetAsync<List<AzureRelease>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{VsrmUrl(orgName, projectId)}/_apis/release/releases?api-version={ApiVersion}&$top=30&queryOrder=descending&$expand=environments";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureReleaseApi>>(body);
        var releases = result?.Value.Select(r => new AzureRelease(
            r.Id,
            r.Name,
            r.Status ?? "unknown",
            r.Environments?.FirstOrDefault()?.Name,
            r.CreatedBy?.DisplayName,
            r.CreatedOn,
            r.ModifiedOn,
            r.ReleaseDefinition?.Name,
            null
        )).ToList() ?? [];

        await cache.SetAsync(key, releases, MediumTtl, ct);
        return releases;
    }

    // ─── Work Items ───────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureWorkItem>> GetWorkItemsAsync(
        string orgName, string projectId, string patToken, int maxItems = 200, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:workitems:v2";
        var cached = await cache.GetAsync<List<AzureWorkItem>>(key, ct);
        if (cached is not null) return cached;

        try
        {
            // Use simplified WIQL without overly restrictive state filter
            var wiqlUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/wiql?api-version={ApiVersion}&$top={maxItems}";
            var query = new AzureWiqlQuery(
                "SELECT [System.Id] FROM WorkItems " +
                "WHERE [System.TeamProject] = @project " +
                "ORDER BY [System.ChangedDate] DESC"
            );

            var reqBody = JsonSerializer.Serialize(query);
            var (wiqlOk, wiqlBody) = await PostAsync(patToken, wiqlUrl, reqBody, orgName, ct);
            if (!wiqlOk) return [];

            var wiqlResult = Deserialize<AzureWiqlResponse>(wiqlBody);
            var ids = wiqlResult?.WorkItems?.Take(maxItems).Select(w => w.Id).ToList() ?? [];

            if (ids.Count == 0) return [];

            var fields = "System.Title,System.State,System.WorkItemType,System.AssignedTo," +
                         "Microsoft.VSTS.Common.Priority,System.ChangedDate,System.IterationPath,System.AreaPath";
            var detailUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/workitems?ids={string.Join(",", ids)}&fields={fields}&api-version={ApiVersion}";
            var (detailOk, detailBody) = await GetAsync(patToken, detailUrl, orgName, ct);
            if (!detailOk) return [];

            var detailResult = Deserialize<AzureApiListResponse<AzureWorkItemApi>>(detailBody);
            var workItems = detailResult?.Value.Select(w =>
            {
                var f = w.Fields ?? [];
                return new AzureWorkItem(
                    w.Id,
                    GetField(f, "System.Title"),
                    GetField(f, "System.State"),
                    GetField(f, "System.WorkItemType"),
                    GetField(f, "System.AssignedTo"),
                    GetField(f, "Microsoft.VSTS.Common.Priority"),
                    DateTime.TryParse(GetField(f, "System.ChangedDate"), out var d) ? d : null,
                    GetIterationPath(f),
                    w.Url
                );
            }).ToList() ?? [];

            await cache.SetAsync(key, workItems, MediumTtl, ct);
            return workItems;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching work items for {OrgName}/{ProjectId}", orgName, projectId);
            return [];
        }
    }

    private async Task<DateTime?> GetOldestWorkItemDateAsync(string orgName, string projectId, string patToken, CancellationToken ct)
    {
        var key = $"azure:{orgName}:{projectId}:workitems:oldest";
        var cached = await cache.GetAsync<DateTime?>(key, ct);
        if (cached.HasValue) return cached;

        try
        {
            var wiqlUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/wiql?api-version={ApiVersion}&$top=1";
            var query = new AzureWiqlQuery(
                "SELECT [System.Id] FROM WorkItems " +
                "WHERE [System.TeamProject] = @project " +
                "ORDER BY [System.ChangedDate] ASC"
            );
            var reqBody = JsonSerializer.Serialize(query);
            var (wiqlOk, wiqlBody) = await PostAsync(patToken, wiqlUrl, reqBody, orgName, ct);
            if (!wiqlOk) return null;

            var wiqlResult = Deserialize<AzureWiqlResponse>(wiqlBody);
            var ids = wiqlResult?.WorkItems?.Take(1).Select(w => w.Id).ToList() ?? [];
            if (ids.Count == 0) return null;

            var fields = "System.ChangedDate";
            var detailUrl = $"{OrgUrl(orgName)}/_apis/wit/workitems?ids={string.Join(",", ids)}&fields={fields}&api-version={ApiVersion}";
            var (detailOk, detailBody) = await GetAsync(patToken, detailUrl, orgName, ct);
            if (!detailOk) return null;

            var detailResult = Deserialize<AzureApiListResponse<AzureWorkItemApi>>(detailBody);
            var first = detailResult?.Value?.FirstOrDefault();
            if (first?.Fields == null) return null;
            var dateStr = GetField(first.Fields, "System.ChangedDate");
            if (string.IsNullOrEmpty(dateStr) || !DateTime.TryParse(dateStr, out var d))
                return null;

            await cache.SetAsync(key, d, LongTtl, ct);
            return d;
        }
        catch
        {
            return null;
        }
    }

    // ─── Repositories ─────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureRepository>> GetRepositoriesAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:repos";
        var cached = await cache.GetAsync<List<AzureRepository>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{ProjUrl(orgName, projectId)}/_apis/git/repositories?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureRepositoryApi>>(body);
        var repos = result?.Value.Select(r => new AzureRepository(
            r.Id, r.Name, r.DefaultBranch?.Replace("refs/heads/", ""), r.Size, null, r.RemoteUrl, r.WebUrl, null
        )).ToList() ?? [];

        await cache.SetAsync(key, repos, LongTtl, ct);
        return repos;
    }

    // ─── Teams ────────────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureTeam>> GetTeamsAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:teams";
        var cached = await cache.GetAsync<List<AzureTeam>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{OrgUrl(orgName)}/_apis/projects/{Encode(projectId)}/teams?api-version={ApiVersion}&$expandIdentity=false";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureTeamApi>>(body);
        var teams = result?.Value.Select(t => new AzureTeam(
            t.Id, t.Name, t.Description, t.Url, t.ProjectId, t.ProjectName, null
        )).ToList() ?? [];

        await cache.SetAsync(key, teams, LongTtl, ct);
        return teams;
    }

    public async Task<IEnumerable<AzureTeamMember>> GetTeamMembersAsync(string orgName, string projectId, string teamId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:{teamId}:members";
        var cached = await cache.GetAsync<List<AzureTeamMember>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{OrgUrl(orgName)}/_apis/projects/{Encode(projectId)}/teams/{Encode(teamId)}/members?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureTeamMemberApi>>(body);
        var members = result?.Value
            .Where(m => m.Identity is not null)
            .Select(m => new AzureTeamMember(
                m.Identity!.Id ?? "",
                m.Identity.DisplayName ?? "",
                m.Identity.UniqueName,
                m.Identity.ImageUrl
            )).ToList() ?? [];

        await cache.SetAsync(key, members, LongTtl, ct);
        return members;
    }

    // ─── Sprints / Iterations ─────────────────────────────────────────────────
    public async Task<IEnumerable<AzureSprint>> GetSprintsAsync(string orgName, string projectId, string teamId, string patToken, bool includeWorkItemCounts = false, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:{teamId}:sprints";
        var cacheKey = includeWorkItemCounts ? $"{key}:counts" : key;
        var cached = await cache.GetAsync<List<AzureSprint>>(cacheKey, ct);
        if (cached is not null) return cached;

        var url = $"{ProjUrl(orgName, projectId)}/{Encode(teamId)}/_apis/work/teamsettings/iterations?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureIterationApi>>(body);
        var sprints = result?.Value.Select(i => new AzureSprint(
            i.Id,
            i.Name,
            i.Path,
            i.Attributes?.TimeFrame,
            i.Attributes?.StartDate,
            i.Attributes?.FinishDate,
            teamId,
            null,
            null,
            null,
            null,
            null,
            null
        )).ToList() ?? [];

        if (includeWorkItemCounts)
        {
            var countTasks = sprints.Select(async s =>
            {
                var items = (await GetSprintWorkItemsAsync(orgName, projectId, teamId, s.Id, patToken, ct)).ToList();
                var completed = items.Count(w => IsCompletedState(w.State));
                var incomplete = items.Count - completed;
                return (s, count: items.Count, completed, incomplete);
            });
            var withCounts = await Task.WhenAll(countTasks);
            sprints = withCounts.Select(x => x.s with { WorkItemCount = x.count, CompletedCount = x.completed, IncompleteCount = x.incomplete }).ToList();
        }
        await cache.SetAsync(cacheKey, sprints, LongTtl, ct);
        return sprints;
    }

    public async Task<IEnumerable<AzureWorkItem>> GetSprintWorkItemsAsync(
        string orgName, string projectId, string teamId, string iterationId, string patToken, CancellationToken ct = default)
    {
        var url = $"{ProjUrl(orgName, projectId)}/{Encode(teamId)}/_apis/work/teamsettings/iterations/{Encode(iterationId)}/workitems?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureIterationWorkItemsResponse>(body);
        var ids = result?.WorkItemRelations?
            .Where(r => r.Target?.Id > 0)
            .Select(r => r.Target!.Id)
            .Distinct()
            .ToList() ?? [];

        if (ids.Count == 0) return [];

        var fields = "System.Title,System.State,System.WorkItemType,System.AssignedTo,Microsoft.VSTS.Common.Priority,System.IterationPath";
        var detailUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/workitems?ids={string.Join(",", ids)}&fields={fields}&api-version={ApiVersion}";
        var (detailOk, detailBody) = await GetAsync(patToken, detailUrl, orgName, ct);
        if (!detailOk) return [];

        var detailResult = Deserialize<AzureApiListResponse<AzureWorkItemApi>>(detailBody);
        return detailResult?.Value.Select(w =>
        {
            var f = w.Fields ?? [];
            return new AzureWorkItem(
                w.Id,
                GetField(f, "System.Title"),
                GetField(f, "System.State"),
                GetField(f, "System.WorkItemType"),
                GetField(f, "System.AssignedTo"),
                GetField(f, "Microsoft.VSTS.Common.Priority"),
                null, GetIterationPath(f), w.Url
            );
        }).ToList() ?? [];
    }

    // ─── Wiki ─────────────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureWiki>> GetWikisAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:wikis";
        var cached = await cache.GetAsync<List<AzureWiki>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{ProjUrl(orgName, projectId)}/_apis/wiki/wikis?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureWikiApi>>(body);
        var wikis = result?.Value.Select(w => new AzureWiki(
            w.Id, w.Name, w.Type, w.Url, w.RemoteUrl, w.ProjectId, null
        )).ToList() ?? [];

        await cache.SetAsync(key, wikis, LongTtl, ct);
        return wikis;
    }

    public async Task<IEnumerable<AzureWikiPage>> GetWikiPagesAsync(string orgName, string wikiId, string patToken, CancellationToken ct = default)
    {
        var url = $"{OrgUrl(orgName)}/_apis/wiki/wikis/{Encode(wikiId)}/pages?api-version={ApiVersion}&recursionLevel=2&includeContent=false";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var page = Deserialize<AzureWikiPageApi>(body);
        if (page is null) return [];

        return MapWikiPages(new[] { page });
    }

    // ─── Task Groups ──────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzureTaskGroup>> GetTaskGroupsAsync(string orgName, string projectId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{projectId}:taskgroups";
        var cached = await cache.GetAsync<List<AzureTaskGroup>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{ProjUrl(orgName, projectId)}/_apis/distributedtask/taskgroups?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureTaskGroupApi>>(body);
        var groups = result?.Value.Select(t => new AzureTaskGroup(
            t.Id, t.Name, t.Category, t.Revision, t.CreatedOn, t.CreatedBy?.DisplayName, t.Comment
        )).ToList() ?? [];

        await cache.SetAsync(key, groups, LongTtl, ct);
        return groups;
    }

    // ─── Packaging ────────────────────────────────────────────────────────────
    public async Task<IEnumerable<AzurePackageFeed>> GetPackageFeedsAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:feeds";
        var cached = await cache.GetAsync<List<AzurePackageFeed>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{FeedUrl(orgName)}/_apis/packaging/feeds?api-version={ApiVersion}";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzurePackageFeedApi>>(body);
        var feeds = result?.Value.Select(f => new AzurePackageFeed(
            f.Id, f.Name, f.Description, f.Url, f.IsReadOnly, null
        )).ToList() ?? [];

        await cache.SetAsync(key, feeds, DayTtl, ct);
        return feeds;
    }

    public async Task<IEnumerable<AzurePackage>> GetFeedPackagesAsync(string orgName, string feedId, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:{feedId}:packages";
        var cached = await cache.GetAsync<List<AzurePackage>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{FeedUrl(orgName)}/_apis/packaging/feeds/{Encode(feedId)}/packages?api-version={ApiVersion}&$top=100";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzurePackageApi>>(body);
        var packages = result?.Value.Select(p => new AzurePackage(
            p.Id,
            p.Name,
            p.Versions?.FirstOrDefault()?.Version,
            p.ProtocolType,
            p.Versions?.FirstOrDefault()?.PublishDate
        )).ToList() ?? [];

        await cache.SetAsync(key, packages, DayTtl, ct);
        return packages;
    }

    // ─── Member Entitlements ──────────────────────────────────────────────────
    public async Task<IEnumerable<AzureMemberEntitlement>> GetMemberEntitlementsAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:entitlements";
        var cached = await cache.GetAsync<List<AzureMemberEntitlement>>(key, ct);
        if (cached is not null) return cached;

        var url = $"{VsspsUrl(orgName)}/_apis/memberentitlements?api-version={ApiVersion}&$top=200";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return [];

        var result = Deserialize<AzureApiListResponse<AzureMemberEntitlementApi>>(body);
        var entitlements = result?.Value.Select(e => new AzureMemberEntitlement(
            e.Id,
            e.User?.DisplayName ?? e.Id,
            e.User?.UniqueName,
            e.AccessLevel?.AccountLicenseType,
            e.AccessLevel?.Status,
            e.LastAccessedDate,
            e.ProjectEntitlements?.Select(p => p.ProjectRef?.Name ?? "").Where(n => n != "")
        )).ToList() ?? [];

        await cache.SetAsync(key, entitlements, DayTtl, ct);
        return entitlements;
    }

    // ─── Analytics: User Activity Ranking ─────────────────────────────────────
    public async Task<UserActivityRanking> GetUserActivityRankingAsync(string orgName, string patToken, int days, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:ranking:v2:{days}";
        var cached = await cache.GetAsync<UserActivityRanking>(key, ct);
        if (cached is not null) return cached;

        var from = DateTime.UtcNow.AddDays(-days);
        var fromStr = from.ToString("yyyy-MM-ddTHH:mm:ssZ");

        var projects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
        var activityMap = new Dictionary<string, UserActivityEntry>(StringComparer.OrdinalIgnoreCase);

        // Process up to 10 projects to avoid timeout
        foreach (var project in projects.Take(10))
        {
            await AggregateCommitActivity(orgName, project.Id, project.Name, patToken, fromStr, activityMap, ct);
            await AggregateWorkItemActivity(orgName, project.Id, project.Name, patToken, fromStr, activityMap, ct);
            await AggregatePrActivity(orgName, project.Id, patToken, fromStr, activityMap, ct);
            await AggregateBuildActivity(orgName, project.Id, patToken, fromStr, activityMap, ct);
        }

        var ranked = activityMap.Values
            .Where(u => u.TotalScore > 0)
            .OrderByDescending(u => u.TotalScore)
            .ToList();

        // Deduplicate by displayName: same person may appear under different keys (email vs uniqueName)
        ranked = MergeByDisplayName(ranked);

        var result = new UserActivityRanking($"Últimos {days} dias", days, from, DateTime.UtcNow, ranked);
        await cache.SetAsync(key, result, DayTtl, ct);
        return result;
    }

    // ─── Analytics: Project Priority ─────────────────────────────────────────
    public async Task<ProjectPriorityReport> GetProjectPriorityAsync(string orgName, string patToken, int days, CancellationToken ct = default)
    {
        var key = $"azure:{orgName}:priority:{days}";
        var cached = await cache.GetAsync<ProjectPriorityReport>(key, ct);
        if (cached is not null) return cached;

        var from = DateTime.UtcNow.AddDays(-days);
        var fromStr = from.ToString("yyyy-MM-ddTHH:mm:ssZ");

        var projects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
        var projectEntries = new List<ProjectActivityEntry>();

        foreach (var project in projects)
        {
            int wiCount = 0, commitCount = 0, buildCount = 0, prCount = 0;

            // Work items changed in period
            var wiUrl = $"{ProjUrl(orgName, project.Id)}/_apis/wit/wiql?api-version={ApiVersion}&$top=200";
            var wiQuery = new AzureWiqlQuery(
                $"SELECT [System.Id] FROM WorkItems " +
                $"WHERE [System.TeamProject] = @project " +
                $"AND [System.ChangedDate] >= '{from:yyyy-MM-dd}T00:00:00.000Z' " +
                $"ORDER BY [System.ChangedDate] DESC"
            );
            var (wiOk, wiBody) = await PostAsync(patToken, wiUrl, JsonSerializer.Serialize(wiQuery), orgName, ct);
            if (wiOk)
            {
                var wiResult = Deserialize<AzureWiqlResponse>(wiBody);
                wiCount = wiResult?.WorkItems?.Count() ?? 0;
            }

            // Builds in period
            var buildUrl = $"{ProjUrl(orgName, project.Id)}/_apis/build/builds?api-version={ApiVersion}&minTime={fromStr}&$top=100";
            var (buildOk, buildBody) = await GetAsync(patToken, buildUrl, orgName, ct);
            if (buildOk)
            {
                var buildResult = Deserialize<AzureApiListResponse<AzureBuildApi>>(buildBody);
                buildCount = buildResult?.Value.Count() ?? 0;
            }

            // Commits (sample first 3 repos)
            var repos = (await GetRepositoriesAsync(orgName, project.Id, patToken, ct)).Take(3);
            foreach (var repo in repos)
            {
                var commitUrl = $"{ProjUrl(orgName, project.Id)}/_apis/git/repositories/{Encode(repo.Id)}/commits" +
                    $"?api-version={ApiVersion}&searchCriteria.fromDate={fromStr}&$top=50";
                var (commitOk, commitBody) = await GetAsync(patToken, commitUrl, orgName, ct);
                if (commitOk)
                {
                    var commitResult = Deserialize<AzureApiListResponse<AzureCommitApi>>(commitBody);
                    commitCount += commitResult?.Value.Count() ?? 0;
                }
            }

            // Activity score: WI*1 + commits*2 + builds*3 + PRs*2
            int score = wiCount * 1 + commitCount * 2 + buildCount * 3 + prCount * 2;

            if (score > 0)
                projectEntries.Add(new ProjectActivityEntry(
                    project.Id, project.Name, orgName, wiCount, commitCount, buildCount, prCount, score));
        }

        var sorted = projectEntries.OrderByDescending(p => p.ActivityScore).ToList();
        var report = new ProjectPriorityReport($"Últimos {days} dias", days, from, DateTime.UtcNow, sorted);
        await cache.SetAsync(key, report, DayTtl, ct);
        return report;
    }

    // ─── Dashboard Summary ────────────────────────────────────────────────────
    public async Task<DashboardSummary> GetDashboardSummaryAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default)
    {
        var orgList = organizations.ToList();
        var orgSummaries = new List<OrgSummary>();
        var currentSprintProjects = new List<SprintProgressEntry>();
        int totalProjects = 0, totalActive = 0, totalFailing = 0, totalSucceeded = 0;

        foreach (var (orgName, patToken) in orgList)
        {
            var projects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
            int orgActive = 0, orgFailing = 0;

            foreach (var project in projects.Take(5))
            {
                var pipelines = (await GetPipelinesAsync(orgName, project.Id, patToken, ct)).ToList();
                orgActive += pipelines.Count(p => p.Status == "inProgress");
                orgFailing += pipelines.Count(p => p.Result == "failed");
                totalSucceeded += pipelines.Count(p => p.Result == "succeeded");
            }

            // Current sprint projects with items (for dashboard cards)
            foreach (var project in projects.Take(8))
            {
                try
                {
                    var teams = (await GetTeamsAsync(orgName, project.Id, patToken, ct)).Take(3);
                    foreach (var team in teams)
                    {
                        var sprints = (await GetSprintsAsync(orgName, project.Id, team.Id, patToken, true, ct)).ToList();
                        var current = sprints.FirstOrDefault(s => string.Equals(s.Status, "current", StringComparison.OrdinalIgnoreCase));
                        if (current is null || (current.WorkItemCount ?? 0) == 0) continue;

                        currentSprintProjects.Add(new SprintProgressEntry(
                            orgName,
                            project.Id,
                            project.Name,
                            team.Id,
                            team.Name,
                            current.Id,
                            current.Name,
                            current.WorkItemCount ?? 0,
                            current.CompletedCount ?? 0,
                            current.IncompleteCount ?? 0,
                            current.StartDate,
                            current.FinishDate
                        ));
                    }
                }
                catch { /* skip on error */ }
            }

            totalProjects += projects.Count;
            totalActive += orgActive;
            totalFailing += orgFailing;
            orgSummaries.Add(new OrgSummary(orgName, projects.Count, orgActive, orgFailing));
        }

        var orderedSprints = currentSprintProjects.OrderByDescending(s => s.IncompleteCount).ToList();
        return new DashboardSummary(orgList.Count, totalProjects, totalActive, totalFailing, totalSucceeded, 0, 0, orgSummaries, orderedSprints);
    }

    // ─── Timeline ────────────────────────────────────────────────────────────
    public async Task<TimelineResponse> GetTimelineAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default)
    {
        var projects = new List<TimelineProjectEntry>();
        var sprints = new List<TimelineSprintEntry>();

        foreach (var (orgName, patToken) in organizations)
        {
            try
            {
                var orgProjects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
                foreach (var project in orgProjects.Take(20))
                {
                    try
                    {
                        var startDate = await GetOldestWorkItemDateAsync(orgName, project.Id, patToken, ct);
                        var workItems = (await GetWorkItemsAsync(orgName, project.Id, patToken, 1, ct)).ToList();
                        var endDate = workItems.FirstOrDefault()?.ChangedDate ?? DateTime.UtcNow;

                        projects.Add(new TimelineProjectEntry(
                            orgName,
                            project.Id,
                            project.Name,
                            startDate,
                            endDate
                        ));

                        var teams = (await GetTeamsAsync(orgName, project.Id, patToken, ct)).Take(5);
                        foreach (var team in teams)
                        {
                            var teamSprints = (await GetSprintsAsync(orgName, project.Id, team.Id, patToken, false, ct)).ToList();
                            foreach (var s in teamSprints)
                            {
                                if (s.StartDate.HasValue || s.FinishDate.HasValue)
                                {
                                    sprints.Add(new TimelineSprintEntry(
                                        orgName,
                                        project.Id,
                                        project.Name,
                                        team.Id,
                                        team.Name ?? "",
                                        s.Id,
                                        s.Name,
                                        s.StartDate,
                                        s.FinishDate,
                                        s.Status
                                    ));
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Error fetching timeline for project {ProjectId}", project.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error fetching timeline for org {OrgName}", orgName);
            }
        }

        return new TimelineResponse(projects, sprints);
    }

    // ─── Today Updates ───────────────────────────────────────────────────────
    public async Task<TodayUpdatesResponse> GetTodayUpdatesAsync(IEnumerable<(string OrgName, string PatToken)> organizations, CancellationToken ct = default)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var fromStr = todayUtc.ToString("yyyy-MM-dd") + "T00:00:00.000Z";
        var updates = new List<TodayUpdateEntry>();

        foreach (var (orgName, patToken) in organizations)
        {
            try
            {
                var projects = (await GetProjectsAsync(orgName, patToken, ct)).ToList();
                foreach (var project in projects.Take(15))
                {
                    try
                    {
                        var projectUpdates = await GetTodayUpdatesForProjectAsync(orgName, project.Id, project.Name, patToken, fromStr, todayUtc, ct);
                        updates.AddRange(projectUpdates);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Error fetching today updates for project {ProjectId}", project.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error fetching today updates for org {OrgName}", orgName);
            }
        }

        var ordered = updates.OrderByDescending(u => u.ChangedDate).ToList();
        return new TodayUpdatesResponse(ordered);
    }

    private async Task<List<TodayUpdateEntry>> GetTodayUpdatesForProjectAsync(
        string orgName, string projectId, string projectName, string patToken,
        string fromStr, DateTime todayUtc, CancellationToken ct)
    {
        var wiqlUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/wiql?api-version={ApiVersion}&$top=100";
        var query = new AzureWiqlQuery(
            $"SELECT [System.Id] FROM WorkItems " +
            $"WHERE [System.TeamProject] = @project " +
            $"AND [System.ChangedDate] >= '{fromStr}' " +
            $"ORDER BY [System.ChangedDate] DESC"
        );
        var (wiqlOk, wiqlBody) = await PostAsync(patToken, wiqlUrl, JsonSerializer.Serialize(query), orgName, ct);
        if (!wiqlOk) return [];

        var wiqlResult = Deserialize<AzureWiqlResponse>(wiqlBody);
        var ids = wiqlResult?.WorkItems?.Take(100).Select(w => w.Id).ToList() ?? [];
        if (ids.Count == 0) return [];

        var fields = "System.Id,System.Title,System.State,System.WorkItemType,System.ChangedDate,System.CreatedDate";
        var detailUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/workitems?ids={string.Join(",", ids)}&fields={fields}&api-version={ApiVersion}";
        var (detailOk, detailBody) = await GetAsync(patToken, detailUrl, orgName, ct);
        if (!detailOk) return [];

        var detailResult = Deserialize<AzureApiListResponse<AzureWorkItemApi>>(detailBody);
        var result = new List<TodayUpdateEntry>();

        foreach (var w in detailResult?.Value ?? [])
        {
            var f = w.Fields ?? [];
            var title = GetField(f, "System.Title");
            var state = GetField(f, "System.State");
            var workItemType = GetField(f, "System.WorkItemType");
            var changedDateStr = GetField(f, "System.ChangedDate");
            var createdDateStr = GetField(f, "System.CreatedDate");

            if (!DateTime.TryParse(changedDateStr, out var changedDate)) continue;
            DateTime? createdDate = DateTime.TryParse(createdDateStr, out var cd) ? cd : null;

            var changeType = GetChangeType(state, changedDate, createdDate, todayUtc);

            result.Add(new TodayUpdateEntry(
                orgName,
                projectId,
                projectName,
                w.Id,
                title,
                workItemType,
                changeType,
                state,
                changedDate,
                createdDate,
                w.Url
            ));
        }

        return result;
    }

    private static string GetChangeType(string state, DateTime changedDate, DateTime? createdDate, DateTime todayUtc)
    {
        var changedToday = changedDate.Date == todayUtc;
        var createdToday = createdDate.HasValue && createdDate.Value.Date == todayUtc;

        if (createdToday)
            return "Created";
        if (changedToday && IsCompletedState(state))
            return "Completed";
        return "Updated";
    }

    // ─── Private: Activity Aggregators ────────────────────────────────────────

    /// <summary>
    /// Extracts (normalizedKey, displayName, uniqueName) from an Azure DevOps identity field.
    /// The normalizedKey is uniqueName (email) when available, otherwise lowercase displayName.
    /// This ensures the same person is always mapped to the same key regardless of the source.
    /// </summary>
    private static (string Key, string DisplayName, string? UniqueName) GetIdentityFields(
        Dictionary<string, object> fields, string fieldName)
    {
        if (!fields.TryGetValue(fieldName, out var value)) return (string.Empty, string.Empty, null);

        if (value is JsonElement element && element.ValueKind == JsonValueKind.Object)
        {
            var displayName = element.TryGetProperty("displayName", out var dn) ? dn.GetString() ?? string.Empty : string.Empty;
            var uniqueName = element.TryGetProperty("uniqueName", out var un) ? un.GetString() ?? string.Empty : string.Empty;
            // Prefer uniqueName (email) as key; fall back to lowercase displayName
            var key = !string.IsNullOrEmpty(uniqueName) ? uniqueName.ToLowerInvariant() : displayName.ToLowerInvariant();
            return (key, displayName, uniqueName.Length > 0 ? uniqueName : null);
        }

        var str = GetField(fields, fieldName);
        return (str.ToLowerInvariant(), str, null);
    }

    private async Task AggregateCommitActivity(
        string orgName, string projectId, string projectName, string patToken,
        string fromStr, Dictionary<string, UserActivityEntry> map, CancellationToken ct)
    {
        var repos = (await GetRepositoriesAsync(orgName, projectId, patToken, ct)).Take(5);
        foreach (var repo in repos)
        {
            var url = $"{ProjUrl(orgName, projectId)}/_apis/git/repositories/{Encode(repo.Id)}/commits" +
                $"?api-version={ApiVersion}&searchCriteria.fromDate={fromStr}&$top=200";
            var (ok, body) = await GetAsync(patToken, url, orgName, ct);
            if (!ok) continue;

            var result = Deserialize<AzureApiListResponse<AzureCommitApi>>(body);
            foreach (var commit in result?.Value ?? [])
            {
                // Normalize: use email (lowercase) as key — matches uniqueName format from other APIs
                var email = (commit.Author?.Email ?? commit.Committer?.Email ?? "").Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(email) || email == "unknown") continue;
                var name = commit.Author?.Name ?? commit.Committer?.Name ?? email;
                AddOrUpdate(map, email, name, email, commits: 1);
            }
        }
    }

    private async Task AggregateWorkItemActivity(
        string orgName, string projectId, string projectName, string patToken,
        string fromStr, Dictionary<string, UserActivityEntry> map, CancellationToken ct)
    {
        var fromDate = DateTime.Parse(fromStr).ToString("yyyy-MM-dd");
        var wiqlUrl = $"{ProjUrl(orgName, projectId)}/_apis/wit/wiql?api-version={ApiVersion}&$top=200";
        var query = new AzureWiqlQuery(
            $"SELECT [System.Id] FROM WorkItems " +
            $"WHERE [System.TeamProject] = @project " +
            $"AND [System.ChangedDate] >= '{fromDate}T00:00:00.000Z' " +
            $"ORDER BY [System.ChangedDate] DESC"
        );
        var (wiqlOk, wiqlBody) = await PostAsync(patToken, wiqlUrl, JsonSerializer.Serialize(query), orgName, ct);
        if (!wiqlOk) return;

        var wiqlResult = Deserialize<AzureWiqlResponse>(wiqlBody);
        var ids = wiqlResult?.WorkItems?.Take(200).Select(w => w.Id).ToList() ?? [];
        if (ids.Count == 0) return;

        // Fetch identity objects — Azure DevOps returns full identity object for these fields
        var detailUrl = $"{OrgUrl(orgName)}/_apis/wit/workitems?ids={string.Join(",", ids)}&fields=System.AssignedTo,System.ChangedBy&api-version={ApiVersion}";
        var (detailOk, detailBody) = await GetAsync(patToken, detailUrl, orgName, ct);
        if (!detailOk) return;

        var detailResult = Deserialize<AzureApiListResponse<AzureWorkItemApi>>(detailBody);
        foreach (var wi in detailResult?.Value ?? [])
        {
            var f = wi.Fields ?? [];
            var (cbKey, cbDisplay, cbUnique) = GetIdentityFields(f, "System.ChangedBy");
            var (atKey, atDisplay, atUnique) = GetIdentityFields(f, "System.AssignedTo");

            if (!string.IsNullOrEmpty(cbKey))
                AddOrUpdate(map, cbKey, cbDisplay, cbUnique, workItems: 1);
            else if (!string.IsNullOrEmpty(atKey))
                AddOrUpdate(map, atKey, atDisplay, atUnique, workItems: 1);
        }
    }

    private async Task AggregatePrActivity(
        string orgName, string projectId, string patToken,
        string fromStr, Dictionary<string, UserActivityEntry> map, CancellationToken ct)
    {
        var url = $"{ProjUrl(orgName, projectId)}/_apis/git/pullrequests?api-version={ApiVersion}&searchCriteria.status=all&searchCriteria.minTime={fromStr}&$top=100";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return;

        var result = Deserialize<AzureApiListResponse<AzurePullRequestApi>>(body);
        foreach (var pr in result?.Value ?? [])
        {
            // uniqueName is the email — matches commit author email key
            var uniqueName = pr.CreatedBy?.UniqueName?.Trim().ToLowerInvariant();
            var displayName = pr.CreatedBy?.DisplayName ?? uniqueName ?? string.Empty;
            if (!string.IsNullOrEmpty(uniqueName))
                AddOrUpdate(map, uniqueName, displayName, uniqueName, pullRequests: 1);
        }
    }

    private async Task AggregateBuildActivity(
        string orgName, string projectId, string patToken,
        string fromStr, Dictionary<string, UserActivityEntry> map, CancellationToken ct)
    {
        var url = $"{ProjUrl(orgName, projectId)}/_apis/build/builds?api-version={ApiVersion}&minTime={fromStr}&$top=100";
        var (ok, body) = await GetAsync(patToken, url, orgName, ct);
        if (!ok) return;

        var result = Deserialize<AzureApiListResponse<AzureBuildApi>>(body);
        foreach (var build in result?.Value ?? [])
        {
            var uniqueName = build.RequestedBy?.UniqueName?.Trim().ToLowerInvariant();
            var displayName = build.RequestedBy?.DisplayName ?? uniqueName ?? string.Empty;
            if (!string.IsNullOrEmpty(uniqueName))
                AddOrUpdate(map, uniqueName, displayName, uniqueName, builds: 1);
        }
    }

    /// <summary>
    /// Normalizes display name for merge key: trim, collapse multiple spaces.
    /// </summary>
    private static string NormalizeDisplayKey(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "";
        return Regex.Replace(name.Trim(), @"\s+", " ");
    }

    /// <summary>
    /// Merges entries with the same displayName (case-insensitive, normalized). Same person can appear under
    /// different keys (e.g. git email vs Azure uniqueName). Sums all metrics for identical names.
    /// </summary>
    private static List<UserActivityEntry> MergeByDisplayName(List<UserActivityEntry> ranked)
    {
        var byDisplay = new Dictionary<string, UserActivityEntry>(StringComparer.OrdinalIgnoreCase);
        foreach (var e in ranked)
        {
            var key = NormalizeDisplayKey(e.DisplayName);
            if (string.IsNullOrEmpty(key)) key = e.UserId;

            if (byDisplay.TryGetValue(key, out var existing))
            {
                var eName = e.DisplayName ?? "";
                var bestName = (existing.DisplayName ?? "").Contains('@') && !eName.Contains('@')
                    ? eName : (existing.DisplayName ?? "");
                byDisplay[key] = existing with
                {
                    DisplayName = bestName,
                    CommitCount = existing.CommitCount + e.CommitCount,
                    WorkItemsChanged = existing.WorkItemsChanged + e.WorkItemsChanged,
                    PullRequestsCreated = existing.PullRequestsCreated + e.PullRequestsCreated,
                    BuildsTriggered = existing.BuildsTriggered + e.BuildsTriggered,
                    TotalScore = existing.TotalScore + e.TotalScore,
                };
            }
            else
            {
                byDisplay[key] = e;
            }
        }
        return byDisplay.Values.OrderByDescending(u => u.TotalScore).ToList();
    }

    private static void AddOrUpdate(
        Dictionary<string, UserActivityEntry> map, string key, string displayName, string? uniqueName,
        int commits = 0, int workItems = 0, int pullRequests = 0, int builds = 0)
    {
        int score = (commits * 3) + (workItems * 2) + (pullRequests * 4) + (builds * 1);
        if (map.TryGetValue(key, out var existing))
        {
            map[key] = existing with
            {
                // Keep the most descriptive displayName (prefer non-email)
                DisplayName = existing.DisplayName.Contains('@') && !displayName.Contains('@')
                    ? displayName : existing.DisplayName,
                CommitCount = existing.CommitCount + commits,
                WorkItemsChanged = existing.WorkItemsChanged + workItems,
                PullRequestsCreated = existing.PullRequestsCreated + pullRequests,
                BuildsTriggered = existing.BuildsTriggered + builds,
                TotalScore = existing.TotalScore + score,
            };
        }
        else
        {
            map[key] = new UserActivityEntry(key, displayName, uniqueName,
                commits, workItems, pullRequests, builds, score);
        }
    }

    // ─── Private: HTTP Helpers ────────────────────────────────────────────────
    private async Task<(bool Ok, string Body)> GetAsync(string patToken, string url, string orgName, CancellationToken ct)
    {
        try
        {
            var client = CreateClient(patToken);
            var response = await client.GetAsync(url, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("GET {Url} → {Status} | {Body}", url, (int)response.StatusCode, body[..Math.Min(200, body.Length)]);
                return (false, body);
            }
            return (true, body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GET {Url} failed", url);
            return (false, string.Empty);
        }
    }

    private async Task<(bool Ok, string Body)> PostAsync(string patToken, string url, string jsonBody, string orgName, CancellationToken ct)
    {
        try
        {
            var client = CreateClient(patToken);
            var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("POST {Url} → {Status} | {Body}", url, (int)response.StatusCode, body[..Math.Min(200, body.Length)]);
                return (false, body);
            }
            return (true, body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "POST {Url} failed", url);
            return (false, string.Empty);
        }
    }

    private HttpClient CreateClient(string patToken)
    {
        var client = httpClientFactory.CreateClient("AzureDevOps");
        var encoded = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{patToken.Trim()}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", encoded);
        return client;
    }

    private static T? Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return default;
        try { return JsonSerializer.Deserialize<T>(json, JsonOptions); }
        catch { return default; }
    }

    private static string GetIterationPath(Dictionary<string, object> fields)
    {
        var keys = new[] { "System.IterationPath", "system.iterationpath" };
        foreach (var key in keys)
        {
            if (!fields.TryGetValue(key, out var value)) continue;
            if (value is System.Text.Json.JsonElement element)
            {
                if (element.ValueKind == System.Text.Json.JsonValueKind.String)
                    return element.GetString() ?? string.Empty;
                if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (element.TryGetProperty("path", out var pathEl)) return pathEl.GetString() ?? string.Empty;
                    if (element.TryGetProperty("name", out var nameEl)) return nameEl.GetString() ?? string.Empty;
                }
            }
            if (value != null) return value.ToString() ?? string.Empty;
        }
        return string.Empty;
    }

    private static string GetField(Dictionary<string, object> fields, string key)
    {
        if (!fields.TryGetValue(key, out var value)) return string.Empty;

        if (value is not JsonElement element)
            return value?.ToString() ?? string.Empty;

        return element.ValueKind switch
        {
            // Plain string field (e.g. System.Title, System.State)
            JsonValueKind.String => element.GetString() ?? string.Empty,

            // Identity object field (e.g. System.AssignedTo, System.ChangedBy)
            // Returns { "displayName": "...", "uniqueName": "...", ... }
            JsonValueKind.Object => element.TryGetProperty("displayName", out var dn)
                ? dn.GetString() ?? string.Empty
                : element.TryGetProperty("name", out var nm)
                    ? nm.GetString() ?? string.Empty
                    : element.ToString(),

            // Numbers, booleans, etc.
            JsonValueKind.Number => element.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => string.Empty,
            _ => string.Empty,
        };
    }

    private static IEnumerable<AzureWikiPage> MapWikiPages(IEnumerable<AzureWikiPageApi> pages) =>
        pages.Select(p => new AzureWikiPage(
            p.Id, p.Path, p.Content, p.Url, p.IsParentPage,
            p.SubPages is not null ? MapWikiPages(p.SubPages) : null
        ));
}
