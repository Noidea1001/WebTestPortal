using Microsoft.AspNetCore.Http;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Implementations;

public class FileStorageService : IFileStorageService
{
    private readonly string[] _allowedExtensions = { ".png", ".jpg", ".jpeg", ".gif", ".webp" };
    private const long MaxImageBytes = 5 * 1024 * 1024;

    public async Task<string?> UploadAsync(IFormFile file, string subFolder)
    {
        if (file is null || file.Length == 0) return null;
        if (file.Length > MaxImageBytes) return null;

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(ext)) return null;

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", subFolder);
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadsRoot, fileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/uploads/{subFolder}/{fileName}";
    }

    public Task DeleteAsync(string? path)
    {
        if (string.IsNullOrEmpty(path)) return Task.CompletedTask;

        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", path.TrimStart('/'));
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
