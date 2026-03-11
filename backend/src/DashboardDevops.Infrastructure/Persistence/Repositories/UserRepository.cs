using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DashboardDevops.Infrastructure.Persistence.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, ct);
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    public async Task<User?> GetByIdTrackedAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    public async Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(User user, CancellationToken ct = default)
    {
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> AnyAsync(CancellationToken ct = default)
    {
        return await db.Users.AnyAsync(ct);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.Users.AsNoTracking().OrderBy(u => u.Email).ToListAsync(ct);
    }

    public async Task UpdateLastLoginAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is not null)
        {
            user.LastLoginAt = DateTime.UtcNow;
            user.FailedLoginAttempts = 0;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<bool> IncrementFailedLoginAsync(string email, int maxAttempts, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null) return false;
        user.FailedLoginAttempts++;
        var wasDeactivated = user.FailedLoginAttempts >= maxAttempts;
        if (wasDeactivated)
            user.IsActive = false;
        await db.SaveChangesAsync(ct);
        return wasDeactivated;
    }
}
