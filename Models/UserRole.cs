using System.Text.Json.Serialization;

namespace WebTestPortal.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    Admin = 0,
    Student = 1
}
