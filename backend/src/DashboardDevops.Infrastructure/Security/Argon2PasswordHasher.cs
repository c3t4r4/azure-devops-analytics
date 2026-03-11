using Argon2Sharp;
using DashboardDevops.Domain.Interfaces;

namespace DashboardDevops.Infrastructure.Security;

public class Argon2PasswordHasher : IPasswordHasher
{
    private const string EncryptedPrefix = "$argon2";

    public string HashPassword(string password)
    {
        var parameters = Argon2Parameters.CreateBuilder()
            .WithType(Argon2Type.Argon2id)
            .WithMemorySizeKB(65536)
            .WithIterations(3)
            .WithParallelism(4)
            .WithRandomSalt()
            .Build();

        return Argon2PhcFormat.HashToPhcString(password, parameters);
    }

    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;

        if (hash.StartsWith(EncryptedPrefix, StringComparison.Ordinal))
        {
            var (isValid, _) = Argon2PhcFormat.VerifyPhcString(password, hash);
            return isValid;
        }

        return BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
