using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Interfaces;

public interface ITestService
{
    Task<IEnumerable<TestSummaryDto>> GetMyTestsAsync(int userId);
    Task<TestAdminDetailDto?> GetTestDetailAsync(int userId, int id);
    Task<Test> CreateTestAsync(int userId, TestUpsertDto dto);
    Task UpdateTestMetadataAsync(int userId, int id, TestUpsertDto dto);
    Task PublishTestAsync(int userId, int id, bool publish);
    Task DeleteTestAsync(int userId, int id);
    Task<Question> AddQuestionAsync(int userId, int testId, QuestionUpsertDto dto);
    Task UpdateQuestionAsync(int userId, int testId, int questionId, QuestionUpsertDto dto);
    Task DeleteQuestionAsync(int userId, int testId, int questionId);
    Task<string?> UploadQuestionImageAsync(int userId, int testId, int questionId, string fileName, long fileLength, Stream fileStream);
    Task<Test?> GetWithQuestionsAsync(int testId);
}
