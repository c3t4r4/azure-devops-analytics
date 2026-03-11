using DashboardDevops.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DashboardDevops.Infrastructure.Background;

public class DashboardRefreshWorker(
    IServiceProvider services,
    ILogger<DashboardRefreshWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Dashboard refresh worker started. Interval: {Interval} minutes.", Interval.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);
                if (stoppingToken.IsCancellationRequested) break;

                using var scope = services.CreateScope();
                var dashboardCache = scope.ServiceProvider.GetRequiredService<IDashboardCacheService>();
                var orgCache = scope.ServiceProvider.GetRequiredService<IOrgDataCacheService>();
                await dashboardCache.RefreshFromAzureAsync(stoppingToken);
                await orgCache.RefreshAllOrganizationsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Dashboard refresh worker error.");
            }
        }

        logger.LogInformation("Dashboard refresh worker stopped.");
    }
}
