using System.Text.Json;
using System.Text.Json.Serialization;

namespace WebTestPortal.Extensions;

/// <summary>
/// Every DateTime this API stores (CreatedAt, StartedAt, CompletedAt, etc.) is written with
/// DateTime.UtcNow — but EF Core's SQLite provider does not persist DateTimeKind, so a value
/// read back from the database comes back as Kind=Unspecified. The default System.Text.Json
/// serializer then writes it WITHOUT a trailing "Z", and the browser's `new Date(iso)` treats
/// that as local time instead of UTC — silently shifting every timestamp shown in the UI by
/// the viewer's UTC offset (e.g. a submission at 8:16 PM local time renders as 1:15 PM).
///
/// This converter always treats an incoming DateTime as UTC (regardless of its Kind tag) and
/// serializes it with the "Z" suffix, so `new Date(iso)` on the client correctly parses it as
/// UTC and every page's toLocaleString()/toLocaleDateString() call converts it to the viewer's
/// real local timezone.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utc.ToString("o"));
    }
}

public class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        var value = reader.GetDateTime();
        return value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) { writer.WriteNullValue(); return; }
        var utc = value.Value.Kind == DateTimeKind.Utc ? value.Value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
        writer.WriteStringValue(utc.ToString("o"));
    }
}
