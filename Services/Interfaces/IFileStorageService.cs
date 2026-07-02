namespace WebTestPortal.Services.Interfaces;

public interface IFileStorageService
{
    Task<string?> UploadAsync(IFormFile file, string subFolder);
    Task DeleteAsync(string? path);
}
