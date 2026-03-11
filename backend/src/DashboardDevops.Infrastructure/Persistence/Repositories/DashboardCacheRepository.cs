using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DashboardDevops.Infrastructure.Persistence.Repositories;

public class DashboardCacheRepository(AppDbContext context) : IDashboardCacheRepository
{
    public async Task<(string? EncryptedContent, string? ContentHash)> GetAsync(string cacheKey, CancellationToken ct = default)
    {
        var row = await context.DashboardCaches
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CacheKey == cacheKey, ct);
        return row is null ? (null, null) : (row.EncryptedContent, row.ContentHash);
    }

    public async Task UpsertAsync(string cacheKey, string encryptedContent, string contentHash, CancellationToken ct = default)
    {
        var existing = await context.DashboardCaches.FirstOrDefaultAsync(c => c.CacheKey == cacheKey, ct);
        if (existing is not null)
        {
            existing.EncryptedContent = encryptedContent;
            existing.ContentHash = contentHash;
            existing.FetchedAt = DateTime.UtcNow;
        }
        else
        {
            context.DashboardCaches.Add(new DashboardCache
            {
                Id = Guid.NewGuid(),
                CacheKey = cacheKey,
                EncryptedContent = encryptedContent,
                ContentHash = contentHash,
                FetchedAt = DateTime.UtcNow
            });
        }
        await context.SaveChangesAsync(ct);
    }
}
