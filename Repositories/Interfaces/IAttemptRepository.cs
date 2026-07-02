using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Interfaces;

public interface IAttemptRepository : IRepository<TestAttempt>
{
    Task<IEnumerable<TestAttempt>> GetByUserAsync(int userId);
    Task<TestAttempt?> GetWithDetailsAsync(int attemptId);
    Task<TestAttempt?> GetByUserAsync(int userId, int attemptId);
    Task<TestAttempt?> GetInProgressAsync(int userId, int testId);
}
