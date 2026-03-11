using System.Security.Cryptography;
using DashboardDevops.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DashboardDevops.Infrastructure.Security;

public class AesEncryptionService : IEncryptionService
{
    private const string EncryptedPrefix = "ENC:";
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32;

    private readonly byte[] _key;
    private readonly ILogger<AesEncryptionService> _logger;

    public AesEncryptionService(IConfiguration configuration, ILogger<AesEncryptionService> logger)
    {
        _logger = logger;
        var keyBase64 = configuration["Encryption:Key"] ?? configuration["ENCRYPTION__KEY"];
        if (string.IsNullOrWhiteSpace(keyBase64))
        {
            _logger.LogWarning("Encryption key not configured. Organization data will NOT be encrypted. Set Encryption__Key in .env");
            _key = [];
        }
        else
        {
            try
            {
                var keyBytes = Convert.FromBase64String(keyBase64.Trim());
                if (keyBytes.Length < KeySize)
                {
                    using var sha = SHA256.Create();
                    _key = sha.ComputeHash(keyBytes);
                }
                else
                {
                    _key = keyBytes[..KeySize];
                }
            }
            catch (FormatException)
            {
                _logger.LogWarning("Invalid encryption key format (expected Base64). Using SHA256 of raw string.");
                using var sha = SHA256.Create();
                _key = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(keyBase64));
            }
        }
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return plainText;
        if (_key.Length == 0) return plainText;

        var plainBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var ciphertext = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plainBytes, ciphertext, tag);

        var combined = new byte[NonceSize + ciphertext.Length + TagSize];
        Buffer.BlockCopy(nonce, 0, combined, 0, NonceSize);
        Buffer.BlockCopy(ciphertext, 0, combined, NonceSize, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, combined, NonceSize + ciphertext.Length, TagSize);

        return EncryptedPrefix + Convert.ToBase64String(combined);
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return cipherText;
        if (_key.Length == 0) return cipherText;

        if (!cipherText.StartsWith(EncryptedPrefix, StringComparison.Ordinal))
            return cipherText;

        try
        {
            var combined = Convert.FromBase64String(cipherText[EncryptedPrefix.Length..]);
            if (combined.Length < NonceSize + TagSize) return cipherText;

            var nonce = combined.AsSpan(0, NonceSize);
            var tag = combined.AsSpan(combined.Length - TagSize, TagSize);
            var cipherBytes = combined.AsSpan(NonceSize, combined.Length - NonceSize - TagSize);

            var plainBytes = new byte[cipherBytes.Length];
            using var aes = new AesGcm(_key, TagSize);
            aes.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return System.Text.Encoding.UTF8.GetString(plainBytes);
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "Failed to decrypt. Data may be corrupted or key may have changed.");
            return cipherText;
        }
    }

    public bool IsEncrypted(string? value) =>
        !string.IsNullOrEmpty(value) && value.StartsWith(EncryptedPrefix, StringComparison.Ordinal);
}
