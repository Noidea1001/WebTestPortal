using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.Extensions;
using WebTestPortal.Models;

namespace WebTestPortal.Extensions;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            db.Database.EnsureCreated();
            await EnsureSchemaCompatibilityAsync(db);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Failed to initialize database.", ex);
        }

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            await roleManager.CreateAsync(new IdentityRole<int>("Admin"));
        }
        if (!await roleManager.RoleExistsAsync("Student"))
        {
            await roleManager.CreateAsync(new IdentityRole<int>("Student"));
        }

        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var seedConfig = configuration.GetSection("SeedAdmin");
        var adminUsername = seedConfig["Username"] ?? "admin";

        if (await userManager.FindByNameAsync(adminUsername) == null)
        {
            var admin = new User
            {
                UserName = adminUsername,
                FullName = seedConfig["FullName"] ?? "Administrator",
                Role = UserRole.Admin,
                CreatedAt = DateTime.UtcNow,
                Email = "admin@webtestportal.local",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(admin, seedConfig["Password"] ?? "Admin123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, "Admin");
            }
        }
    }

    private static async Task EnsureSchemaCompatibilityAsync(AppDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync();
        }

        try
        {
            await EnsureColumnAsync(connection, "Tests", "TimeLimitMinutes", "INTEGER NULL");
            await EnsureColumnAsync(connection, "Tests", "ShuffleQuestions", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(connection, "Tests", "ShuffleOptions", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(connection, "Tests", "PassingScorePercent", "REAL NULL");
            await EnsureColumnAsync(connection, "Tests", "ShowResultsImmediately", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(connection, "Tests", "ShowCorrectAnswers", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(connection, "Tests", "AllowReview", "INTEGER NOT NULL DEFAULT 1");

            await EnsureColumnAsync(connection, "Questions", "Subject", "TEXT NULL");
            await EnsureColumnAsync(connection, "Questions", "Difficulty", "TEXT NULL");
            await EnsureColumnAsync(connection, "Questions", "Explanation", "TEXT NULL");
            await EnsureColumnAsync(connection, "Questions", "IsActive", "INTEGER NOT NULL DEFAULT 1");
            var addedCreatedAt = await EnsureColumnAsync(connection, "Questions", "CreatedAt", "TEXT NULL");
            await EnsureColumnAsync(connection, "Questions", "UpdatedAt", "TEXT NULL");

            // Existing rows created before this column existed have no CreatedAt value yet —
            // backfill them once so the admin question card always has a real timestamp to show
            // instead of blank/epoch, rather than pretending they were all created "now".
            if (addedCreatedAt)
            {
                await using var backfill = connection.CreateCommand();
                backfill.CommandText = "UPDATE Questions SET CreatedAt = COALESCE(CreatedAt, @p1) WHERE CreatedAt IS NULL;";
                var param = backfill.CreateParameter();
                param.ParameterName = "@p1";
                param.Value = DateTime.UtcNow.ToString("o");
                backfill.Parameters.Add(param);
                await backfill.ExecuteNonQueryAsync();
            }

            await EnsureColumnAsync(connection, "TestAttempts", "QuestionOrderJson", "TEXT NULL");
            await EnsureColumnAsync(connection, "TestAttempts", "OptionOrderJson", "TEXT NULL");
            await EnsureColumnAsync(connection, "TestAttempts", "DraftAnswersJson", "TEXT NULL");
            await EnsureColumnAsync(connection, "TestAttempts", "LastAutoSavedAt", "TEXT NULL");
            await EnsureColumnAsync(connection, "TestAttempts", "FlaggedQuestionIdsJson", "TEXT NULL");
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> EnsureColumnAsync(System.Data.Common.DbConnection connection, string table, string column, string columnDefinitionSql)
    {
        await using var check = connection.CreateCommand();
        check.CommandText = $"SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name = '{column}';";
        var exists = Convert.ToInt32(await check.ExecuteScalarAsync()) > 0;
        if (!exists)
        {
            await using var alter = connection.CreateCommand();
            alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {columnDefinitionSql};";
            await alter.ExecuteNonQueryAsync();
            return true;
        }
        return false;
    }
}
