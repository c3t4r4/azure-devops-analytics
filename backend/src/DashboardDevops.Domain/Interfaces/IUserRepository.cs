using DashboardDevops.Domain.Entities;

namespace DashboardDevops.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByIdTrackedAsync(Guid id, CancellationToken ct = default);
    Task<User> AddAsync(User user, CancellationToken ct = default);
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task DeleteAsync(User user, CancellationToken ct = default);
    Task<bool> AnyAsync(CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);
    Task UpdateLastLoginAsync(Guid userId, CancellationToken ct = default);
    /// <returns>True se o usuário foi desativado por exceder tentativas.</returns>
    Task<bool> IncrementFailedLoginAsync(string email, int maxAttempts, CancellationToken ct = default);
}
