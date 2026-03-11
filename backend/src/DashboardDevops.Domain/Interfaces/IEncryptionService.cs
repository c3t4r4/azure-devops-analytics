namespace DashboardDevops.Domain.Interfaces;

public interface IEncryptionService
{
    /// <summary>Criptografa o texto usando AES-256-GCM.</summary>
    string Encrypt(string plainText);

    /// <summary>Descriptografa o texto. Retorna o valor original se não estiver criptografado (legado).</summary>
    string Decrypt(string cipherText);

    /// <summary>Indica se o valor está criptografado (possui prefixo ENC:).</summary>
    bool IsEncrypted(string? value);
}
