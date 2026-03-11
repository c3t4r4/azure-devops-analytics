namespace DashboardDevops.Domain.Interfaces;

/// <summary>Dispara atualização do cache ao adicionar/alterar organização. Chamado após Create/Update de org.</summary>
public interface IOrgRefreshTrigger
{
    Task TriggerRefreshForOrgAsync(string orgName, string patToken, CancellationToken ct = default);
}
