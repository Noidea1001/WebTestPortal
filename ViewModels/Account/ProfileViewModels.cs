using System.ComponentModel.DataAnnotations;

namespace WebTestPortal.ViewModels.Account;

public class ProfileViewModel
{
    [Required(ErrorMessage = "Username is required.")]
    [StringLength(64, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 64 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(128, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;
}

public class ChangePasswordViewModel
{
    [Required]
    [DataType(DataType.Password)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(128, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match.")]
    [DataType(DataType.Password)]
    public string ConfirmPassword { get; set; } = string.Empty;
}