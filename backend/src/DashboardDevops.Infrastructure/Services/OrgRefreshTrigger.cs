using DashboardDevops.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace DashboardDevops.Infrastructure.Services;

public class OrgRefreshTrigger(IServiceScopeFactory scopeFactory) : IOrgRefreshTrigger
{
    public async Task TriggerRefreshForOrgAsync(string orgName, string patToken, CancellationToken ct = default)
    {
        using var scope = scopeFactory.CreateScope();
        var cache = scope.ServiceProvider.GetRequiredService<IOrgDataCacheService>();
        await cache.RefreshOrganizationAsync(orgName, patToken, ct);
    }
}
