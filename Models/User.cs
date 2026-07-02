using Microsoft.AspNetCore.Identity;

namespace WebTestPortal.Models;

public class User : IdentityUser<int>
{
    public string FullName { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Student;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation: tests this user authored (only meaningful for Admins)
    public ICollection<Test> CreatedTests { get; set; } = new List<Test>();

    // Navigation: attempts this user has made (only meaningful for Students)
    public ICollection<TestAttempt> Attempts { get; set; } = new List<TestAttempt>();
}
