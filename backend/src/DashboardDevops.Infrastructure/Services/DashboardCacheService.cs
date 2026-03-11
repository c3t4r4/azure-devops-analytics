using System.Security.Cryptography;
using System.Text.Json;
using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Domain.Models;
using Microsoft.Extensions.Logging;

namespace DashboardDevops.Infrastructure.Services;

public class DashboardCacheService(
    IOrganizationRepository orgRepo,
    IAzureDevOpsService azureService,
    IDashboardCacheRepository cacheRepo,
    ICacheService redisCache,
    IEncryptionService encryption,
    ILogger<DashboardCacheService> logger)
    : IDashboardCacheService
{
    private const string SummaryKey = "dashboard:summary";
    private const string TimelineKey = "dashboard:timeline";
    private const string TodayUpdatesKey = "dashboard:today-updates";
    private static readonly TimeSpan RedisTtl = TimeSpan.FromMinutes(5);
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<(DashboardSummary? Summary, string? Hash)> GetSummaryAsync(CancellationToken ct = default)
    {
        var hashKey = SummaryKey + ":hash";
        var cachedHash = await redisCache.GetAsync<string>(hashKey, ct);
        var cachedEncrypted = await redisCache.GetAsync<string>(SummaryKey, ct);

        if (!string.IsNullOrEmpty(cachedEncrypted) && cachedHash is not null)
        {
            var decrypted = DecryptContent(cachedEncrypted);
            if (decrypted is not null)
            {
                var summary = JsonSerializer.Deserialize<DashboardSummary>(decrypted, JsonOptions);
                if (summary is not null) return (summary, cachedHash);
            }
        }

        var (encrypted, contentHash) = await cacheRepo.GetAsync(SummaryKey, ct);
        if (!string.IsNullOrEmpty(encrypted) && contentHash is not null)
        {
            var decrypted = DecryptContent(encrypted);
            if (decrypted is not null)
            {
                var summary = JsonSerializer.Deserialize<DashboardSummary>(decrypted, JsonOptions);
                if (summary is not null)
                {
                    await redisCache.SetAsync(SummaryKey, encrypted, RedisTtl, ct);
                    await redisCache.SetAsync(hashKey, contentHash, RedisTtl, ct);
                    return (summary, contentHash);
                }
            }
        }

        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive).Select(o => (o.Name, o.PatToken)).ToList();
        if (activeOrgs.Count == 0) return (null, null);

        var summaryData = await azureService.GetDashboardSummaryAsync(activeOrgs, ct);
        var json = JsonSerializer.Serialize(summaryData, JsonOptions);
        var hash = ComputeHash(json);
        var encryptedContent = encryption.Encrypt(json);

        await cacheRepo.UpsertAsync(SummaryKey, encryptedContent, hash, ct);
        await redisCache.SetAsync(SummaryKey, encryptedContent, RedisTtl, ct);
        await redisCache.SetAsync(hashKey, hash, RedisTtl, ct);

        return (summaryData, hash);
    }

    public async Task<(TimelineResponse? Timeline, string? Hash)> GetTimelineAsync(CancellationToken ct = default)
    {
        var hashKey = TimelineKey + ":hash";
        var cachedEncrypted = await redisCache.GetAsync<string>(TimelineKey, ct);
        var cachedHash = await redisCache.GetAsync<string>(hashKey, ct);

        if (!string.IsNullOrEmpty(cachedEncrypted) && cachedHash is not null)
        {
            var decrypted = DecryptContent(cachedEncrypted);
            if (decrypted is not null)
            {
                var timeline = JsonSerializer.Deserialize<TimelineResponse>(decrypted, JsonOptions);
                if (timeline is not null) return (timeline, cachedHash);
            }
        }

        var (encrypted, contentHash) = await cacheRepo.GetAsync(TimelineKey, ct);
        if (!string.IsNullOrEmpty(encrypted) && contentHash is not null)
        {
            var decrypted = DecryptContent(encrypted);
            if (decrypted is not null)
            {
                var timeline = JsonSerializer.Deserialize<TimelineResponse>(decrypted, JsonOptions);
                if (timeline is not null)
                {
                    await redisCache.SetAsync(TimelineKey, encrypted, RedisTtl, ct);
                    await redisCache.SetAsync(hashKey, contentHash, RedisTtl, ct);
                    return (timeline, contentHash);
                }
            }
        }

        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive).Select(o => (o.Name, o.PatToken)).ToList();
        if (activeOrgs.Count == 0) return (null, null);

        var timelineData = await azureService.GetTimelineAsync(activeOrgs, ct);
        var json = JsonSerializer.Serialize(timelineData, JsonOptions);
        var hash = ComputeHash(json);
        var encryptedContent = encryption.Encrypt(json);

        await cacheRepo.UpsertAsync(TimelineKey, encryptedContent, hash, ct);
        await redisCache.SetAsync(TimelineKey, encryptedContent, RedisTtl, ct);
        await redisCache.SetAsync(hashKey, hash, RedisTtl, ct);

        return (timelineData, hash);
    }

    public async Task<(TodayUpdatesResponse? TodayUpdates, string? Hash)> GetTodayUpdatesAsync(CancellationToken ct = default)
    {
        var hashKey = TodayUpdatesKey + ":hash";
        var cachedEncrypted = await redisCache.GetAsync<string>(TodayUpdatesKey, ct);
        var cachedHash = await redisCache.GetAsync<string>(hashKey, ct);

        if (!string.IsNullOrEmpty(cachedEncrypted) && cachedHash is not null)
        {
            var decrypted = DecryptContent(cachedEncrypted);
            if (decrypted is not null)
            {
                var updates = JsonSerializer.Deserialize<TodayUpdatesResponse>(decrypted, JsonOptions);
                if (updates is not null) return (updates, cachedHash);
            }
        }

        var (encrypted, contentHash) = await cacheRepo.GetAsync(TodayUpdatesKey, ct);
        if (!string.IsNullOrEmpty(encrypted) && contentHash is not null)
        {
            var decrypted = DecryptContent(encrypted);
            if (decrypted is not null)
            {
                var updates = JsonSerializer.Deserialize<TodayUpdatesResponse>(decrypted, JsonOptions);
                if (updates is not null)
                {
                    await redisCache.SetAsync(TodayUpdatesKey, encrypted, RedisTtl, ct);
                    await redisCache.SetAsync(hashKey, contentHash, RedisTtl, ct);
                    return (updates, contentHash);
                }
            }
        }

        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive).Select(o => (o.Name, o.PatToken)).ToList();
        if (activeOrgs.Count == 0) return (null, null);

        var updatesData = await azureService.GetTodayUpdatesAsync(activeOrgs, ct);
        var json = JsonSerializer.Serialize(updatesData, JsonOptions);
        var hash = ComputeHash(json);
        var encryptedContent = encryption.Encrypt(json);

        await cacheRepo.UpsertAsync(TodayUpdatesKey, encryptedContent, hash, ct);
        await redisCache.SetAsync(TodayUpdatesKey, encryptedContent, RedisTtl, ct);
        await redisCache.SetAsync(hashKey, hash, RedisTtl, ct);

        return (updatesData, hash);
    }

    private static string ComputeHash(string json)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private string? DecryptContent(string encrypted)
    {
        try
        {
            return encryption.Decrypt(encrypted);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to decrypt cached content.");
            return null;
        }
    }

    public async Task RefreshFromAzureAsync(CancellationToken ct = default)
    {
        var orgs = await orgRepo.GetAllAsync(ct);
        var activeOrgs = orgs.Where(o => o.IsActive).Select(o => (o.Name, o.PatToken)).ToList();
        if (activeOrgs.Count == 0) return;

        try
        {
            var summary = await azureService.GetDashboardSummaryAsync(activeOrgs, ct);
            var summaryJson = JsonSerializer.Serialize(summary, JsonOptions);
            var summaryHash = ComputeHash(summaryJson);
            var (_, storedSummaryHash) = await cacheRepo.GetAsync(SummaryKey, ct);
            if (storedSummaryHash != summaryHash)
            {
                var encrypted = encryption.Encrypt(summaryJson);
                await cacheRepo.UpsertAsync(SummaryKey, encrypted, summaryHash, ct);
                await redisCache.SetAsync(SummaryKey, encrypted, RedisTtl, ct);
                await redisCache.SetAsync(SummaryKey + ":hash", summaryHash, RedisTtl, ct);
                logger.LogDebug("Dashboard summary cache updated.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to refresh dashboard summary from Azure.");
        }

        try
        {
            var timeline = await azureService.GetTimelineAsync(activeOrgs, ct);
            var timelineJson = JsonSerializer.Serialize(timeline, JsonOptions);
            var timelineHash = ComputeHash(timelineJson);
            var (_, storedTimelineHash) = await cacheRepo.GetAsync(TimelineKey, ct);
            if (storedTimelineHash != timelineHash)
            {
                var encrypted = encryption.Encrypt(timelineJson);
                await cacheRepo.UpsertAsync(TimelineKey, encrypted, timelineHash, ct);
                await redisCache.SetAsync(TimelineKey, encrypted, RedisTtl, ct);
                await redisCache.SetAsync(TimelineKey + ":hash", timelineHash, RedisTtl, ct);
                logger.LogDebug("Dashboard timeline cache updated.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to refresh dashboard timeline from Azure.");
        }

        try
        {
            var todayUpdates = await azureService.GetTodayUpdatesAsync(activeOrgs, ct);
            var updatesJson = JsonSerializer.Serialize(todayUpdates, JsonOptions);
            var updatesHash = ComputeHash(updatesJson);
            var (_, storedUpdatesHash) = await cacheRepo.GetAsync(TodayUpdatesKey, ct);
            if (storedUpdatesHash != updatesHash)
            {
                var encrypted = encryption.Encrypt(updatesJson);
                await cacheRepo.UpsertAsync(TodayUpdatesKey, encrypted, updatesHash, ct);
                await redisCache.SetAsync(TodayUpdatesKey, encrypted, RedisTtl, ct);
                await redisCache.SetAsync(TodayUpdatesKey + ":hash", updatesHash, RedisTtl, ct);
                logger.LogDebug("Dashboard today-updates cache updated.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to refresh dashboard today-updates from Azure.");
        }
    }
}
