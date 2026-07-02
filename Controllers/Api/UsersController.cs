using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Controllers.Api;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var user = await _userService.GetUserAsync(id);
        if (user == null) return NotFound();
        return Ok(ToDto(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(UserCreateDto dto)
    {
        var user = await _userService.CreateUserAsync(dto.Username, dto.Email, dto.FullName, dto.Password, dto.Role);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToDto(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UserUpdateDto dto)
    {
        await _userService.UpdateUserAsync(CurrentUserId, id, dto.Username, dto.Email, dto.FullName, dto.Role, dto.Password);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _userService.DeleteUserAsync(CurrentUserId, id);
        return NoContent();
    }

    private static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        Username = user.UserName ?? string.Empty,
        Email = user.Email ?? string.Empty,
        FullName = user.FullName,
        Role = user.Role,
        CreatedAt = user.CreatedAt
    };
}
