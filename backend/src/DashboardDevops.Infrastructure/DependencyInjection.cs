using DashboardDevops.Domain.Interfaces;
using DashboardDevops.Infrastructure.AzureDevOps;
using DashboardDevops.Infrastructure.Background;
using DashboardDevops.Infrastructure.Cache;
using DashboardDevops.Infrastructure.Persistence;
using DashboardDevops.Infrastructure.Persistence.Repositories;
using DashboardDevops.Infrastructure.Security;
using DashboardDevops.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace DashboardDevops.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        var redisConnection = configuration["Redis:ConnectionString"] ?? "localhost:6379";
        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<RedisCacheService>>();
            try
            {
                var config = ConfigurationOptions.Parse(redisConnection);
                config.ConnectTimeout = 3000;
                config.AbortOnConnectFail = false;
                return ConnectionMultiplexer.Connect(config);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not connect to Redis at {Connection}. Cache will be unavailable. " +
                    "Run with Docker Compose for full environment.", redisConnection);
                var config = ConfigurationOptions.Parse(redisConnection);
                config.AbortOnConnectFail = false;
                return ConnectionMultiplexer.Connect(config);
            }
        });

        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<IEncryptionService, AesEncryptionService>();
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDashboardCacheRepository, DashboardCacheRepository>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IAzureDevOpsService, AzureDevOpsService>();
        services.AddScoped<IDashboardCacheService, DashboardCacheService>();
        services.AddScoped<IOrgDataCacheService, OrgDataCacheService>();
        services.AddSingleton<IOrgRefreshTrigger, OrgRefreshTrigger>();
        services.AddHostedService<DashboardRefreshWorker>();

        services.AddHttpClient("AzureDevOps", client =>
        {
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}
