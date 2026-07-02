using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;

namespace WebTestPortal.Repositories.Interfaces;

public interface ITestRepository : IRepository<Test>
{
    Task<IEnumerable<Test>> GetByCreatorAsync(int userId);
    Task<IEnumerable<Test>> GetPublishedWithQuestionsAsync();
    Task<Test?> GetWithDetailsAsync(int id);
    Task<Test?> GetByCreatorAndIdAsync(int userId, int id);
    Task<Test?> GetWithQuestionsAsync(int testId);
}
