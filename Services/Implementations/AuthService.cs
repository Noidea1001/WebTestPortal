using Microsoft.AspNetCore.Identity;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User?> ValidateCredentialsAsync(string username, string password)
    {
        var user = await _userRepository.GetByNameAsync(username);
        user ??= await _userRepository.GetByEmailAsync(username);
        if (user == null) return null;

        var verification = new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash!, password);
        return verification == PasswordVerificationResult.Failed ? null : user;
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        return await _userRepository.GetByIdAsync(userId);
    }

    public async Task<User> RegisterAsync(string username, string email, string fullName, string password)
    {
        var byName = await _userRepository.GetByNameAsync(username);
        if (byName != null) throw new InvalidOperationException("Username is already taken.");

        var byEmail = await _userRepository.GetByEmailAsync(email);
        if (byEmail != null) throw new InvalidOperationException("Email is already registered.");

        var user = new User
        {
            UserName = username,
            Email = email,
            EmailConfirmed = true,
            FullName = fullName,
            Role = UserRole.Student,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userRepository.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _userRepository.AddToRoleAsync(user, UserRole.Student.ToString());
        return user;
    }
}
