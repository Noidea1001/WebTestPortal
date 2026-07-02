using Microsoft.AspNetCore.Identity;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Implementations;

public class UserRepository : IUserRepository
{
    private readonly UserManager<User> _userManager;

    public UserRepository(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _userManager.FindByIdAsync(id.ToString());
    }

    public async Task<User?> GetByNameAsync(string userName)
    {
        return await _userManager.FindByNameAsync(userName);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _userManager.FindByEmailAsync(email);
    }

    public async Task<bool> ExistsByNameAsync(string userName)
    {
        return await GetByNameAsync(userName) != null;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        return await Task.FromResult(_userManager.Users.OrderBy(u => u.UserName));
    }

    public async Task AddAsync(User user)
    {
        await _userManager.CreateAsync(user);
    }

    public async Task<IdentityResult> UpdateAsync(User user)
    {
        return await _userManager.UpdateAsync(user);
    }

    public async Task DeleteAsync(User user)
    {
        await _userManager.DeleteAsync(user);
    }

    public Task<bool> IsInRoleAsync(User user, string role)
    {
        return _userManager.IsInRoleAsync(user, role);
    }

    public Task AddToRoleAsync(User user, string role)
    {
        return _userManager.AddToRoleAsync(user, role);
    }

    public Task RemoveFromRoleAsync(User user, string role)
    {
        return _userManager.RemoveFromRoleAsync(user, role);
    }

    public async Task<string?> GeneratePasswordResetTokenAsync(User user)
    {
        return await _userManager.GeneratePasswordResetTokenAsync(user);
    }

    public async Task<IdentityResult> ResetPasswordAsync(User user, string token, string newPassword)
    {
        return await _userManager.ResetPasswordAsync(user, token, newPassword);
    }

    public async Task<IdentityResult> CreateAsync(User user, string password)
    {
        return await _userManager.CreateAsync(user, password);
    }
}
