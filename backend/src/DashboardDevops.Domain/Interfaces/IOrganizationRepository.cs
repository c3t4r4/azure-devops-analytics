using DashboardDevops.Domain.Entities;

namespace DashboardDevops.Domain.Interfaces;

public interface IOrganizationRepository
{
    Task<IEnumerable<Organization>> GetAllAsync(CancellationToken ct = default);
    Task<Organization?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Organization?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<Organization> AddAsync(Organization organization, CancellationToken ct = default);
    Task<Organization> UpdateAsync(Organization organization, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(string name, CancellationToken ct = default);
}
