using Microsoft.AspNetCore.Identity;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByNameAsync(string userName);
    Task<User?> GetByEmailAsync(string email);
    Task<bool> ExistsByNameAsync(string userName);
    Task<IEnumerable<User>> GetAllAsync();
    Task AddAsync(User user);
    Task<IdentityResult> UpdateAsync(User user);
    Task DeleteAsync(User user);
    Task<bool> IsInRoleAsync(User user, string role);
    Task AddToRoleAsync(User user, string role);
    Task RemoveFromRoleAsync(User user, string role);
    Task<string?> GeneratePasswordResetTokenAsync(User user);
    Task<IdentityResult> ResetPasswordAsync(User user, string token, string newPassword);
    Task<IdentityResult> CreateAsync(User user, string password);
}
