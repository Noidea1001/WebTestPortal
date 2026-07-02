using WebTestPortal.Models;

namespace WebTestPortal.Repositories.Interfaces;

public interface IQuestionRepository
{
    Task<IEnumerable<Question>> GetByTestAsync(int testId);
}
