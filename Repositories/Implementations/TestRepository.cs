using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Implementations;

public class TestRepository : Repository<Test>, ITestRepository
{
    public TestRepository(AppDbContext db) : base(db) { }

    public async Task<IEnumerable<Test>> GetByCreatorAsync(int userId)
    {
        return await _db.Tests
            .Where(t => t.CreatedByUserId == userId)
            .Include(t => t.CreatedBy)
            .Include(t => t.Questions)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Test>> GetPublishedWithQuestionsAsync()
    {
        return await _db.Tests
            .Where(t => t.IsPublished)
            .Include(t => t.Questions)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<Test?> GetWithDetailsAsync(int id)
    {
        return await _db.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Options.OrderBy(o => o.OrderIndex))
            .Include(t => t.Attempts)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<Test?> GetByCreatorAndIdAsync(int userId, int id)
    {
        return await _db.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Options.OrderBy(o => o.OrderIndex))
            .FirstOrDefaultAsync(t => t.Id == id && t.CreatedByUserId == userId);
    }

    public async Task<Test?> GetWithQuestionsAsync(int testId)
    {
        return await _db.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Options.OrderBy(o => o.OrderIndex))
            .Include(t => t.Attempts)
            .FirstOrDefaultAsync(t => t.Id == testId);
    }
}
