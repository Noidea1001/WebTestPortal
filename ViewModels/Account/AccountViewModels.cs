using System.ComponentModel.DataAnnotations;
using WebTestPortal.Models;

namespace WebTestPortal.ViewModels.Account;

public class LoginViewModel
{
    [Required(ErrorMessage = "Username or Email is required.")]
    [Display(Name = "Username or Email")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [DataType(DataType.Password)]
    [StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; } = true;
}

public class RegisterViewModel : LoginViewModel
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(128, MinimumLength = 1, ErrorMessage = "Full name cannot be empty.")]
    public string FullName { get; set; } = string.Empty;
}
