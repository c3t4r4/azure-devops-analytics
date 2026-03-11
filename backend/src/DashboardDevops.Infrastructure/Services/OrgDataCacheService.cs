using System.Security.Cryptography;
using System.Text.Json;
using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Domain.Models;
using Microsoft.Extensions.Logging;

namespace DashboardDevops.Infrastructure.Services;

public class OrgDataCacheService(
    IOrganizationRepository orgRepo,
    IAzureDevOpsService azureService,
    IDashboardCacheRepository cacheRepo,
    ICacheService redisCache,
    IEncryptionService encryption,
    ILogger<OrgDataCacheService> logger)
    : IOrgDataCacheService
{
    private static readonly TimeSpan RedisTtl = TimeSpan.FromMinutes(5);
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static string Key(string org, string suffix) => $"org:{org}:{suffix}";

    public async Task<IEnumerable<AzureProject>?> GetProjectsAsync(string orgName, CancellationToken ct = default)
        => await GetAsync<List<AzureProject>>(Key(orgName, "projects"), ct);

    public async Task<IEnumerable<ProjectWithDetails>?> GetProjectsWithDetailsAsync(string orgName, CancellationToken ct = default)
        => await GetAsync<List<ProjectWithDetails>>(Key(orgName, "projects-details"), ct);

    public async Task<IEnumerable<AzurePipeline>?> GetPipelinesAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzurePipeline>>(Key(orgName, $"proj:{projectId}:pipelines"), ct);

    public async Task<IEnumerable<AzureRelease>?> GetReleasesAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzureRelease>>(Key(orgName, $"proj:{projectId}:releases"), ct);

    public async Task<IEnumerable<AzureWorkItem>?> GetWorkItemsAsync(string orgName, string projectId, int max = 5000, CancellationToken ct = default)
    {
        var list = await GetAsync<List<AzureWorkItem>>(Key(orgName, $"proj:{projectId}:workitems"), ct);
        return list is null ? null : list.Take(max).ToList();
    }

    public async Task<IEnumerable<AzureTeam>?> GetTeamsAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzureTeam>>(Key(orgName, $"proj:{projectId}:teams"), ct);

    public async Task<IEnumerable<AzureSprint>?> GetSprintsAsync(string orgName, string projectId, string teamId, bool includeCounts, CancellationToken ct = default)
        => await GetAsync<List<AzureSprint>>(Key(orgName, $"proj:{projectId}:team:{teamId}:sprints:{(includeCounts ? "c" : "n")}"), ct);

    public async Task<IEnumerable<AzureRepository>?> GetRepositoriesAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzureRepository>>(Key(orgName, $"proj:{projectId}:repos"), ct);

    public async Task<IEnumerable<AzureWiki>?> GetWikisAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzureWiki>>(Key(orgName, $"proj:{projectId}:wikis"), ct);

    public async Task<IEnumerable<AzureWikiPage>?> GetWikiPagesAsync(string orgName, string wikiId, CancellationToken ct = default)
        => await GetAsync<List<AzureWikiPage>>(Key(orgName, $"wiki:{wikiId}:pages"), ct);

    public async Task<IEnumerable<AzureTaskGroup>?> GetTaskGroupsAsync(string orgName, string projectId, CancellationToken ct = default)
        => await GetAsync<List<AzureTaskGroup>>(Key(orgName, $"proj:{projectId}:taskgroups"), ct);

    public async Task<IEnumerable<AzurePackageFeed>?> GetPackageFeedsAsync(string orgName, CancellationToken ct = default)
        => await GetAsync<List<AzurePackageFeed>>(Key(orgName, "feeds"), ct);

    public async Task<IEnumerable<AzurePackage>?> GetFeedPackagesAsync(string orgName, string feedId, CancellationToken ct = default)
        => await GetAsync<List<AzurePackage>>(Key(orgName, $"feed:{feedId}:packages"), ct);

    private async Task<T?> GetAsync<T>(string cacheKey, CancellationToken ct) where T : class
    {
        var hashKey = cacheKey + ":hash";
        var cached = await redisCache.GetAsync<string>(cacheKey, ct);
        if (!string.IsNullOrEmpty(cached))
        {
            var dec = Decrypt(cached);
            if (dec is not null) return JsonSerializer.Deserialize<T>(dec, JsonOptions);
        }

        var (encrypted, _) = await cacheRepo.GetAsync(cacheKey, ct);
        if (string.IsNullOrEmpty(encrypted)) return null;

        var decrypted = Decrypt(encrypted);
        if (decrypted is null) return null;

        var result = JsonSerializer.Deserialize<T>(decrypted, JsonOptions);
        if (result is not null)
        {
            await redisCache.SetAsync(cacheKey, encrypted, RedisTtl, ct);
        }
        return result;
    }

    private async Task SetAsync<T>(string cacheKey, T value, CancellationToken ct) where T : class
    {
        var json = JsonSerializer.Serialize(value, JsonOptions);
        var hash = ComputeHash(json);
        var encrypted = encryption.Encrypt(json);
        await cacheRepo.UpsertAsync(cacheKey, encrypted, hash, ct);
        await redisCache.SetAsync(cacheKey, encrypted, RedisTtl, ct);
        await redisCache.SetAsync(cacheKey + ":hash", hash, RedisTtl, ct);
    }

    public async Task RefreshOrganizationAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        try
        {
            var projects = (await azureService.GetProjectsAsync(orgName, patToken, ct)).ToList();
            if (projects.Count == 0) return;

            await SetAsync(Key(orgName, "projects"), projects, ct);

            var projectsWithDetails = (await azureService.GetProjectsWithDetailsAsync(orgName, patToken, ct)).ToList();
            await SetAsync(Key(orgName, "projects-details"), projectsWithDetails, ct);

            foreach (var project in projects.Take(10))
            {
                try
                {
                    var pipelines = (await azureService.GetPipelinesAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:pipelines"), pipelines, ct);

                    var releases = (await azureService.GetReleasesAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:releases"), releases, ct);

                    var workItems = (await azureService.GetWorkItemsAsync(orgName, project.Id, patToken, 5000, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:workitems"), workItems, ct);

                    var teams = (await azureService.GetTeamsAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:teams"), teams, ct);

                    var repos = (await azureService.GetRepositoriesAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:repos"), repos, ct);

                    var wikis = (await azureService.GetWikisAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:wikis"), wikis, ct);
                    foreach (var wiki in wikis.Take(3))
                    {
                        try
                        {
                            var pages = (await azureService.GetWikiPagesAsync(orgName, wiki.Id, patToken, ct)).ToList();
                            await SetAsync(Key(orgName, $"wiki:{wiki.Id}:pages"), pages, ct);
                        }
                        catch (Exception ex)
                        {
                            logger.LogDebug(ex, "Skip wiki pages for wiki {WikiId}", wiki.Id);
                        }
                    }

                    var taskGroups = (await azureService.GetTaskGroupsAsync(orgName, project.Id, patToken, ct)).ToList();
                    await SetAsync(Key(orgName, $"proj:{project.Id}:taskgroups"), taskGroups, ct);

                    foreach (var team in teams.Take(5))
                    {
                        var sprints = (await azureService.GetSprintsAsync(orgName, project.Id, team.Id, patToken, true, ct)).ToList();
                        await SetAsync(Key(orgName, $"proj:{project.Id}:team:{team.Id}:sprints:c"), sprints, ct);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Error refreshing project {ProjectId} in org {OrgName}", project.Id, orgName);
                }
            }

            try
            {
                var feeds = (await azureService.GetPackageFeedsAsync(orgName, patToken, ct)).ToList();
                await SetAsync(Key(orgName, "feeds"), feeds, ct);
                foreach (var feed in feeds.Take(10))
                {
                    try
                    {
                        var packages = (await azureService.GetFeedPackagesAsync(orgName, feed.Id, patToken, ct)).ToList();
                        await SetAsync(Key(orgName, $"feed:{feed.Id}:packages"), packages, ct);
                    }
                    catch (Exception ex)
                    {
                        logger.LogDebug(ex, "Skip packages for feed {FeedId}", feed.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error refreshing feeds for org {OrgName}", orgName);
            }

            logger.LogInformation("Refreshed cache for organization {OrgName}", orgName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to refresh org {OrgName}", orgName);
        }
    }

    public async Task RefreshAllOrganizationsAsync(CancellationToken ct = default)
    {
        var orgs = await orgRepo.GetAllAsync(ct);
        var active = orgs.Where(o => o.IsActive).ToList();
        foreach (var org in active)
        {
            await RefreshOrganizationAsync(org.Name, org.PatToken, ct);
        }
    }

    private static string ComputeHash(string json)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }

    private string? Decrypt(string encrypted)
    {
        try { return encryption.Decrypt(encrypted); }
        catch (Exception ex) { logger.LogWarning(ex, "Decrypt failed"); return null; }
    }
}
