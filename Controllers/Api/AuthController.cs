using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using WebTestPortal.DTOs;
using WebTestPortal.Services.Interfaces;
using WebTestPortal.Models;

namespace WebTestPortal.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;

    public AuthController(IAuthService authService, UserManager<User> userManager, SignInManager<User> signInManager)
    {
        _authService = authService;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterDto dto)
    {
        try
        {
            var user = await _authService.RegisterAsync(dto.Username, dto.Email, dto.FullName, dto.Password);
            return Ok(new UserDto
            {
                Id = user.Id,
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto dto)
    {
        var user = await _authService.ValidateCredentialsAsync(dto.Username, dto.Password);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid username/email or password." });
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName!),
            new(ClaimTypes.Role, user.Role.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties { IsPersistent = true });

        return Ok(new UserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }

    // Re-issues the auth cookie with fresh claims (e.g. after a username
    // change). SignInManager.RefreshSignInAsync can't be used here: it
    // signs into Identity's own "Identity.Application" scheme, but this app
    // authenticates against the separate "Cookies" scheme set up in
    // ServiceCollectionExtensions, so it would silently do nothing useful.
    private async Task ReissueAuthCookieAsync(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName!),
            new(ClaimTypes.Role, user.Role.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties { IsPersistent = true });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Logged out." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _authService.GetByIdAsync(userId);
        if (user == null) return Unauthorized();

        return Ok(new UserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileDto dto)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        if (!string.Equals(dto.Username, user.UserName, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _userManager.FindByNameAsync(dto.Username);
            if (existing != null && existing.Id != user.Id)
                return Conflict(new { message = "Username is already taken." });
            user.UserName = dto.Username;
        }

        if (!string.Equals(dto.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing != null && existing.Id != user.Id)
                return Conflict(new { message = "Email is already taken." });
            user.Email = dto.Email;
        }

        user.FullName = dto.FullName;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        await ReissueAuthCookieAsync(user);

        return Ok(new UserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        await ReissueAuthCookieAsync(user);
        return Ok(new { message = "Password changed successfully." });
    }
}

public class UpdateProfileDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
