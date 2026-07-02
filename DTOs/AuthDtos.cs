using System.ComponentModel.DataAnnotations;
using WebTestPortal.Models;

namespace WebTestPortal.DTOs;

public class RegisterDto
{
    [Required, StringLength(64, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Student;
    public DateTime CreatedAt { get; set; }
}
