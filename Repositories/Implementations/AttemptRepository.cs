using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Implementations;

public class AttemptRepository : Repository<TestAttempt>, IAttemptRepository
{
    public AttemptRepository(AppDbContext db) : base(db) { }

    public async Task<IEnumerable<TestAttempt>> GetByUserAsync(int userId)
    {
        return await _db.TestAttempts
            .Where(a => a.UserId == userId)
            .Include(a => a.Test)
            .OrderByDescending(a => a.StartedAt)
            .ToListAsync();
    }

    public async Task<TestAttempt?> GetWithDetailsAsync(int attemptId)
    {
        return await _db.TestAttempts
            .Include(a => a.Test)
                .ThenInclude(t => t.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.User)
            .Include(a => a.Answers)
                .ThenInclude(ans => ans.Question)
                    .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
                .ThenInclude(ans => ans.SelectedOptions)
            .FirstOrDefaultAsync(a => a.Id == attemptId);
    }

    public async Task<TestAttempt?> GetByUserAsync(int userId, int attemptId)
    {
        return await _db.TestAttempts
            .Include(a => a.Test)
                .ThenInclude(t => t.Questions)
                    .ThenInclude(q => q.Options)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);
    }

    public async Task<TestAttempt?> GetInProgressAsync(int userId, int testId)
    {
        return await _db.TestAttempts
            .Include(a => a.Test)
            .FirstOrDefaultAsync(a => a.UserId == userId && a.TestId == testId && !a.IsCompleted);
    }
}
