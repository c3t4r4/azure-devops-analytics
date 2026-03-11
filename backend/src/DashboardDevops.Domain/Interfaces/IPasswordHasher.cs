namespace DashboardDevops.Domain.Interfaces;

public interface IPasswordHasher
{
    /// <summary>Gera hash da senha usando Argon2ID.</summary>
    string HashPassword(string password);

    /// <summary>Verifica se a senha corresponde ao hash.</summary>
    bool VerifyPassword(string password, string hash);
}
