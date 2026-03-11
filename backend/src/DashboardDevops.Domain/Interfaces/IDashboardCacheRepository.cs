namespace DashboardDevops.Domain.Interfaces;

public interface IDashboardCacheRepository
{
    Task<(string? EncryptedContent, string? ContentHash)> GetAsync(string cacheKey, CancellationToken ct = default);
    Task UpsertAsync(string cacheKey, string encryptedContent, string contentHash, CancellationToken ct = default);
}
