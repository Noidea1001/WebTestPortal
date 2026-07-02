using System.ComponentModel.DataAnnotations;
using WebTestPortal.Models;

namespace WebTestPortal.DTOs;

public class UserCreateDto
{
    [Required, StringLength(64, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; } = UserRole.Student;
}

public class UserUpdateDto
{
    [Required, StringLength(64, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Leave null/empty to keep the current password.</summary>
    [StringLength(128, MinimumLength = 6)]
    public string? Password { get; set; }

    [Required]
    public UserRole Role { get; set; } = UserRole.Student;
}
