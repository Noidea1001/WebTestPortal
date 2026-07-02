using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Implementations;

public class QuestionRepository : Repository<Question>, IQuestionRepository
{
    public QuestionRepository(AppDbContext db) : base(db) { }

    public async Task<IEnumerable<Question>> GetByTestAsync(int testId)
    {
        return await _db.Questions
            .Where(q => q.TestId == testId)
            .Include(q => q.Options.OrderBy(o => o.OrderIndex))
            .OrderBy(q => q.OrderIndex)
            .ToListAsync();
    }
}
