using DashboardDevops.Domain.Entities;
using DashboardDevops.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DashboardDevops.Infrastructure.Persistence.Repositories;

public class OrganizationRepository(AppDbContext context, IEncryptionService encryption) : IOrganizationRepository
{
    public async Task<IEnumerable<Organization>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await context.Organizations.OrderBy(o => o.Name).ToListAsync(ct);
        foreach (var org in list)
            DecryptOrg(org);
        return list;
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var org = await context.Organizations.FindAsync([id], ct);
        if (org is not null)
            DecryptOrg(org);
        return org;
    }

    public async Task<Organization?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        var org = await context.Organizations.FirstOrDefaultAsync(o => o.Name == name, ct);
        if (org is not null)
            DecryptOrg(org);
        return org;
    }

    public async Task<Organization> AddAsync(Organization organization, CancellationToken ct = default)
    {
        EncryptOrg(organization);
        context.Organizations.Add(organization);
        await context.SaveChangesAsync(ct);
        DecryptOrg(organization);
        return organization;
    }

    public async Task<Organization> UpdateAsync(Organization organization, CancellationToken ct = default)
    {
        EncryptOrg(organization);
        context.Organizations.Update(organization);
        await context.SaveChangesAsync(ct);
        DecryptOrg(organization);
        return organization;
    }

    private void EncryptOrg(Organization org)
    {
        org.PatToken = EncryptIfNeeded(org.PatToken);
        org.Url = EncryptIfNeeded(org.Url);
    }

    /// <summary>
    /// Criptografa o valor apenas se estiver em plain text.
    /// Se já estiver criptografado (ENC:), descriptografa primeiro e re-criptografa (normaliza migração).
    /// </summary>
    private string EncryptIfNeeded(string? value)
    {
        if (string.IsNullOrEmpty(value)) return value ?? string.Empty;
        var plain = encryption.IsEncrypted(value) ? encryption.Decrypt(value) : value;
        return encryption.Encrypt(plain);
    }

    private void DecryptOrg(Organization org)
    {
        org.PatToken = encryption.Decrypt(org.PatToken);
        org.Url = encryption.Decrypt(org.Url);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var org = await context.Organizations.FindAsync([id], ct);
        if (org is not null)
        {
            context.Organizations.Remove(org);
            await context.SaveChangesAsync(ct);
        }
    }

    public async Task<bool> ExistsAsync(string name, CancellationToken ct = default)
        => await context.Organizations.AnyAsync(o => o.Name == name, ct);
}
