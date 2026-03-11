using DashboardDevops.Application.Organizations;
using Microsoft.Extensions.DependencyInjection;

namespace DashboardDevops.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IOrganizationService, OrganizationService>();
        return services;
    }
}
