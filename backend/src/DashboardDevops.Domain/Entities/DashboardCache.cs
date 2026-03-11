namespace DashboardDevops.Domain.Entities;

public class DashboardCache
{
    public Guid Id { get; set; }
    public string CacheKey { get; set; } = "";
    public string EncryptedContent { get; set; } = "";
    public string ContentHash { get; set; } = "";
    public DateTime FetchedAt { get; set; }
}
