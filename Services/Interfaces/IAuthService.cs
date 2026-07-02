using WebTestPortal.Models;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Interfaces;

public interface IAuthService
{
    Task<User?> ValidateCredentialsAsync(string username, string password);
    Task<User?> GetByIdAsync(int userId);
    Task<User> RegisterAsync(string username, string email, string fullName, string password);
}
