using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WebTestPortal.Models;

namespace WebTestPortal.Data;

public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Test> Tests => Set<Test>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<AnswerOption> AnswerOptions => Set<AnswerOption>();
    public DbSet<TestAttempt> TestAttempts => Set<TestAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();
    public DbSet<SelectedAnswerOption> SelectedAnswerOptions => Set<SelectedAnswerOption>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ----- User -----
        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.FullName).HasMaxLength(128);
        });

        // ----- Test -----
        modelBuilder.Entity<Test>(e =>
        {
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.TimeLimitMinutes).IsRequired(false);

            e.HasOne(t => t.CreatedBy)
                .WithMany(u => u.CreatedTests)
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict); // don't cascade-delete tests if an admin is removed
        });

        // ----- Question -----
        modelBuilder.Entity<Question>(e =>
        {
            e.HasOne(q => q.Test)
                .WithMany(t => t.Questions)
                .HasForeignKey(q => q.TestId)
                .OnDelete(DeleteBehavior.Cascade); // deleting a test removes its questions
        });

        // ----- AnswerOption -----
        modelBuilder.Entity<AnswerOption>(e =>
        {
            e.HasOne(o => o.Question)
                .WithMany(q => q.Options)
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade); // deleting a question removes its options
        });

        // ----- TestAttempt -----
        modelBuilder.Entity<TestAttempt>(e =>
        {
            e.HasOne(a => a.Test)
                .WithMany(t => t.Attempts)
                .HasForeignKey(a => a.TestId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.User)
                .WithMany(u => u.Attempts)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Index to help queries for user's attempts and in-progress checks
            e.HasIndex(a => new { a.UserId, a.TestId, a.IsCompleted });
        });

        // ----- AttemptAnswer -----
        modelBuilder.Entity<AttemptAnswer>(e =>
        {
            e.HasOne(a => a.TestAttempt)
                .WithMany(t => t.Answers)
                .HasForeignKey(a => a.TestAttemptId)
                .OnDelete(DeleteBehavior.Cascade);

            // A question may be referenced by many attempt-answers over time; don't cascade-delete
            // attempt history if a question is edited/removed after attempts already exist.
            e.HasOne(a => a.Question)
                .WithMany()
                .HasForeignKey(a => a.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ----- SelectedAnswerOption (join table forming the many-to-many) -----
        modelBuilder.Entity<SelectedAnswerOption>(e =>
        {
            e.HasOne(s => s.AttemptAnswer)
                .WithMany(a => a.SelectedOptions)
                .HasForeignKey(s => s.AttemptAnswerId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.AnswerOption)
                .WithMany()
                .HasForeignKey(s => s.AnswerOptionId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
