using Microsoft.AspNetCore.Identity;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Data;
using Microsoft.EntityFrameworkCore;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Implementations;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly AppDbContext _db;

    public UserService(IUserRepository userRepository, AppDbContext db)
    {
        _userRepository = userRepository;
        _db = db;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(u => new UserDto
        {
            Id = u.Id,
            Username = u.UserName ?? string.Empty,
            Email = u.Email ?? string.Empty,
            FullName = u.FullName,
            Role = u.Role,
            CreatedAt = u.CreatedAt
        });
    }

    public async Task<User?> GetUserAsync(int id)
    {
        return await _userRepository.GetByIdAsync(id);
    }

    public async Task<User> CreateUserAsync(string userName, string email, string fullName, string password, UserRole role)
    {
        var byName = await _userRepository.GetByNameAsync(userName);
        if (byName != null) throw new InvalidOperationException("Username is already taken.");

        var byEmail = await _userRepository.GetByEmailAsync(email);
        if (byEmail != null) throw new InvalidOperationException("Email is already taken.");

        var user = new User
        {
            UserName = userName,
            FullName = fullName,
            Role = role,
            CreatedAt = DateTime.UtcNow,
            Email = email,
            EmailConfirmed = true
        };

        var result = await _userRepository.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _userRepository.AddToRoleAsync(user, role.ToString());
        return user;
    }

    public async Task UpdateUserAsync(int currentUserId, int id, string userName, string email, string fullName, UserRole role, string? newPassword)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) throw new KeyNotFoundException("User not found.");

        if (!string.Equals(user.UserName, userName, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _userRepository.GetByNameAsync(userName);
            if (existing != null) throw new InvalidOperationException("Username is already taken.");
            user.UserName = userName;
        }

        if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _userRepository.GetByEmailAsync(email);
            if (existing != null) throw new InvalidOperationException("Email is already taken.");
            user.Email = email;
        }

        user.FullName = fullName;

        if (user.Role != role)
        {
            if (user.Id == currentUserId && role != UserRole.Admin)
                throw new InvalidOperationException("You cannot change your own role from Admin.");

            await _userRepository.RemoveFromRoleAsync(user, user.Role.ToString());
            await _userRepository.AddToRoleAsync(user, role.ToString());
            user.Role = role;
        }

        var updateResult = await _userRepository.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", updateResult.Errors.Select(e => e.Description)));
        }

        if (!string.IsNullOrEmpty(newPassword))
        {
            var token = await _userRepository.GeneratePasswordResetTokenAsync(user);
            var passwordResult = await _userRepository.ResetPasswordAsync(user, token!, newPassword);
            if (!passwordResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", passwordResult.Errors.Select(e => e.Description)));
            }
        }
    }

    public async Task DeleteUserAsync(int currentUserId, int id)
    {
        if (currentUserId == id) throw new InvalidOperationException("You cannot delete your own account.");

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) throw new KeyNotFoundException("User not found.");

        // Remove related attempts and their nested data first to avoid FK issues
        using (var tx = await _db.Database.BeginTransactionAsync())
        {
            var attempts = await _db.TestAttempts
                .Where(a => a.UserId == id)
                .Include(a => a.Answers)
                    .ThenInclude(ans => ans.SelectedOptions)
                .ToListAsync();

            foreach (var att in attempts)
            {
                // Remove selected options
                var selected = att.Answers.SelectMany(a => a.SelectedOptions).ToList();
                if (selected.Any()) _db.Set<SelectedAnswerOption>().RemoveRange(selected);

                // Remove answers
                if (att.Answers.Any()) _db.AttemptAnswers.RemoveRange(att.Answers);
            }

            if (attempts.Any()) _db.TestAttempts.RemoveRange(attempts);

            await _db.SaveChangesAsync();

            // Now delete user via repository (which may use Identity API)
            await _userRepository.DeleteAsync(user);

            await tx.CommitAsync();
        }
    }
}
