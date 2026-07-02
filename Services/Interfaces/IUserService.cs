using WebTestPortal.DTOs;
using WebTestPortal.Models;

namespace WebTestPortal.Services.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<User?> GetUserAsync(int id);
    Task<User> CreateUserAsync(string userName, string email, string fullName, string password, UserRole role);
    Task UpdateUserAsync(int currentUserId, int id, string userName, string email, string fullName, UserRole role, string? newPassword);
    Task DeleteUserAsync(int currentUserId, int id);
}
