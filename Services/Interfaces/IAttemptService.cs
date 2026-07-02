using WebTestPortal.DTOs;
using WebTestPortal.Models;

namespace WebTestPortal.Services.Interfaces;

public interface IAttemptService
{
    Task<Test?> GetTestForAttemptAsync(int testId);
    List<QuestionStudentDto> BuildOrderedQuestionDtos(Test test, TestAttempt attempt);
    Dictionary<int, List<int>> GetDraftAnswers(TestAttempt attempt);
    List<int> GetFlaggedQuestionIds(TestAttempt attempt);
    Task<IEnumerable<AvailableTestDto>> GetAvailableTestsAsync(int userId);
    Task<TestAttempt> StartAttemptAsync(int userId, int testId);
    Task<AttemptResultDto> SubmitAttemptAsync(int userId, int attemptId, SubmitAttemptDto dto);
    Task<DateTime> AutoSaveAsync(int userId, int attemptId, SubmitAttemptDto dto);
    Task<AttemptResultDto> GetResultAsync(int userId, int attemptId);
    Task<IEnumerable<AttemptSummaryDto>> GetMyAttemptsAsync(int userId);

    Task<IEnumerable<AttemptSummaryDto>> GetAllAttemptsAsync();
    Task<IEnumerable<AttemptSummaryDto>> GetAttemptsByTestAsync(int testId);
    Task<AttemptResultDto> GetAttemptDetailAsync(int attemptId);
    Task<int> GetTotalAttemptsCountAsync();
}
