using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Implementations;

public class AttemptService : IAttemptService
{
    private readonly ITestRepository _testRepository;
    private readonly IAttemptRepository _attemptRepository;
    private readonly AppDbContext _db;
    private readonly ILogger<AttemptService> _logger;

    public AttemptService(ITestRepository testRepository, IAttemptRepository attemptRepository, AppDbContext db, ILogger<AttemptService> logger)
    {
        _testRepository = testRepository;
        _attemptRepository = attemptRepository;
        _db = db;
        _logger = logger;
    }

    public async Task<Test?> GetTestForAttemptAsync(int testId)
    {
        return await _testRepository.GetWithQuestionsAsync(testId);
    }

    public List<QuestionStudentDto> BuildOrderedQuestionDtos(Test test, TestAttempt attempt)
    {
        return AttemptOrderingHelper.BuildOrderedQuestionDtos(test, attempt);
    }

    public Dictionary<int, List<int>> GetDraftAnswers(TestAttempt attempt)
    {
        return AttemptOrderingHelper.ParseDraftAnswers(attempt);
    }

    public List<int> GetFlaggedQuestionIds(TestAttempt attempt)
    {
        return AttemptOrderingHelper.ParseFlaggedQuestionIds(attempt);
    }

    public async Task<IEnumerable<AvailableTestDto>> GetAvailableTestsAsync(int userId)
    {
        var tests = await _testRepository.GetPublishedWithQuestionsAsync();
        var userAttempts = await _attemptRepository.GetByUserAsync(userId);
        var attemptsByTest = userAttempts.GroupBy(a => a.TestId).ToDictionary(g => g.Key, g => g.ToList());

        return tests.Select(t =>
        {
            var attemptsUsed = attemptsByTest.GetValueOrDefault(t.Id, new List<TestAttempt>()).Count(a => a.IsCompleted);
            return new AvailableTestDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                QuestionCount = t.Questions.Count,
                MaxAttempts = t.MaxAttempts,
                TimeLimitMinutes = t.TimeLimitMinutes,
                AttemptsUsed = attemptsUsed,
                CanAttempt = attemptsUsed < t.MaxAttempts,
                PassingScorePercent = t.PassingScorePercent
            };
        });
    }

    public async Task<TestAttempt> StartAttemptAsync(int userId, int testId)
    {
        _logger.LogInformation("StartAttemptAsync called: user={UserId} test={TestId}", userId, testId);

        var tests = await _testRepository.GetPublishedWithQuestionsAsync();
        var test = tests.FirstOrDefault(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found or not published.");

        var userAttempts = await _attemptRepository.GetByUserAsync(userId);
        var completedAttempts = userAttempts.Count(a => a.TestId == testId && a.IsCompleted);

        if (completedAttempts >= test.MaxAttempts)
            throw new InvalidOperationException("You have used all of your attempts for this test.");

        var inProgress = await _attemptRepository.GetInProgressAsync(userId, testId);
        if (inProgress != null)
        {
            var timeLimit = test.TimeLimitMinutes.GetValueOrDefault();
            var isExpired = timeLimit > 0 && DateTime.UtcNow >= inProgress.StartedAt.AddMinutes(timeLimit);

            if (!isExpired)
            {
                return inProgress;
            }

            // The previous attempt's time already ran out before the student came back.
            // Resuming it would hand back a deadline already in the past, which makes
            // the exam timer auto-submit the instant the page loads. Since no answers
            // were ever saved server-side without a real submit, finalize it as a
            // zero-score attempt and let the student start a genuinely new one instead.
            _logger.LogInformation("Expired in-progress attempt {AttemptId} auto-finalized for user={UserId} test={TestId}", inProgress.Id, userId, testId);
            inProgress.IsCompleted = true;
            inProgress.CompletedAt = inProgress.StartedAt.AddMinutes(timeLimit);
            inProgress.Score = 0;
            await _db.SaveChangesAsync();

            completedAttempts++;
            if (completedAttempts >= test.MaxAttempts)
                throw new InvalidOperationException("Your previous attempt ran out of time, and you have used all of your attempts for this test.");
        }

        var attempt = new TestAttempt
        {
            TestId = testId,
            UserId = userId,
            AttemptNumber = completedAttempts + 1,
            StartedAt = DateTime.UtcNow,
            MaxScore = test.Questions.Sum(q => q.Weight),
            // Generated once per attempt so re-loading the page (or resuming later) keeps
            // showing the same randomized order to this student, like a real proctored exam.
            QuestionOrderJson = AttemptOrderingHelper.GenerateQuestionOrder(test),
            OptionOrderJson = AttemptOrderingHelper.GenerateOptionOrder(test)
        };
        // Use a transaction to guard against concurrent starts
        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            await _attemptRepository.AddAsync(attempt);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            _logger.LogInformation("Attempt created: id={AttemptId} user={UserId} test={TestId}", attempt.Id, userId, testId);
            return attempt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create attempt for user={UserId} test={TestId}", userId, testId);
            try { await tx.RollbackAsync(); } catch { }
            throw;
        }
    }

    public async Task<AttemptResultDto> SubmitAttemptAsync(int userId, int attemptId, SubmitAttemptDto dto)
    {
        _logger.LogInformation("SubmitAttemptAsync called: user={UserId} attempt={AttemptId}", userId, attemptId);

        var attempt = await _attemptRepository.GetByUserAsync(userId, attemptId);
        if (attempt == null) throw new KeyNotFoundException("Attempt not found.");
        if (attempt.IsCompleted) throw new InvalidOperationException("This attempt has already been submitted.");

        var answersByQuestion = dto.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedOptionIds);

        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var oldAnswers = await _db.AttemptAnswers.Where(a => a.TestAttemptId == attemptId).ToListAsync();
            if (oldAnswers.Any()) _db.AttemptAnswers.RemoveRange(oldAnswers);

            double totalScore = 0;
            int addedAnswers = 0;
            foreach (var question in attempt.Test.Questions)
            {
                var selected = answersByQuestion.TryGetValue(question.Id, out var ids) ? ids : new List<int>();
                selected = selected.Where(id => id > 0).ToList();

                var (isCorrect, scoreAwarded) = GradingService.GradeAnswer(question, selected);
                var attemptAnswer = new AttemptAnswer
                {
                    TestAttemptId = attempt.Id,
                    QuestionId = question.Id,
                    IsCorrect = isCorrect,
                    ScoreAwarded = scoreAwarded,
                    SelectedOptions = selected.Select(optId => new SelectedAnswerOption { AnswerOptionId = optId }).ToList()
                };
                _db.AttemptAnswers.Add(attemptAnswer);
                totalScore += scoreAwarded;
                addedAnswers++;
            }

            attempt.Score = totalScore;
            attempt.MaxScore = attempt.Test.Questions.Sum(q => q.Weight);
            attempt.IsCompleted = true;
            attempt.CompletedAt = DateTime.UtcNow;
            // The real submission supersedes any autosaved draft.
            attempt.DraftAnswersJson = null;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation("Attempt submitted: attemptId={AttemptId} user={UserId} answers={Count} score={Score}/{Max}", attemptId, userId, addedAnswers, attempt.Score, attempt.MaxScore);

            return await BuildResultDto(attemptId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit attempt: attemptId={AttemptId} user={UserId}", attemptId, userId);
            try { await tx.RollbackAsync(); } catch { }
            throw;
        }
    }

    public async Task<DateTime> AutoSaveAsync(int userId, int attemptId, SubmitAttemptDto dto)
    {
        var attempt = await _db.TestAttempts
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);

        if (attempt == null) throw new KeyNotFoundException("Attempt not found.");
        if (attempt.IsCompleted) throw new InvalidOperationException("This attempt has already been submitted.");

        attempt.DraftAnswersJson = AttemptOrderingHelper.SerializeDraftAnswers(dto);
        // Only touch the flag state if the client actually sent one — keeps this endpoint
        // backward compatible with any caller that only autosaves answers. The flag itself is
        // stored server-side (not just localStorage) so it survives a refresh, device switch,
        // or the student saving/exiting mid-test as a draft, and is only ever cleared by a
        // real submit.
        if (dto.FlaggedQuestionIds != null)
        {
            attempt.FlaggedQuestionIdsJson = AttemptOrderingHelper.SerializeFlaggedQuestionIds(dto.FlaggedQuestionIds);
        }
        attempt.LastAutoSavedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return attempt.LastAutoSavedAt.Value;
    }

    public async Task<AttemptResultDto> GetResultAsync(int userId, int attemptId)
    {
        var owns = await _db.TestAttempts.AnyAsync(a => a.Id == attemptId && a.UserId == userId);
        if (!owns) throw new KeyNotFoundException("Attempt not found.");

        return await BuildResultDto(attemptId);
    }

    public async Task<IEnumerable<AttemptSummaryDto>> GetMyAttemptsAsync(int userId)
    {
        var attempts = await _attemptRepository.GetByUserAsync(userId);
        return attempts.Select(a => new AttemptSummaryDto
        {
            AttemptId = a.Id,
            TestId = a.TestId,
            TestTitle = a.Test.Title,
            AttemptNumber = a.AttemptNumber,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt,
            IsCompleted = a.IsCompleted,
            Score = a.Score,
            MaxScore = a.MaxScore
        });
    }

    public async Task<IEnumerable<AttemptSummaryDto>> GetAllAttemptsAsync()
    {
        var attempts = await _db.TestAttempts
            .Include(a => a.Test)
            .Include(a => a.User)
            .OrderByDescending(a => a.StartedAt)
            .ToListAsync();

        return attempts.Select(a => new AttemptSummaryDto
        {
            AttemptId = a.Id,
            TestId = a.TestId,
            TestTitle = a.Test.Title,
            AttemptNumber = a.AttemptNumber,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt,
            IsCompleted = a.IsCompleted,
            Score = a.Score,
            MaxScore = a.MaxScore,
            UserName = a.User?.FullName ?? a.User?.UserName ?? "Unknown"
        });
    }

    public async Task<IEnumerable<AttemptSummaryDto>> GetAttemptsByTestAsync(int testId)
    {
        var attempts = await _db.TestAttempts
            .Where(a => a.TestId == testId)
            .Include(a => a.Test)
            .Include(a => a.User)
            .OrderByDescending(a => a.StartedAt)
            .ToListAsync();

        return attempts.Select(a => new AttemptSummaryDto
        {
            AttemptId = a.Id,
            TestId = a.TestId,
            TestTitle = a.Test.Title,
            AttemptNumber = a.AttemptNumber,
            StartedAt = a.StartedAt,
            CompletedAt = a.CompletedAt,
            IsCompleted = a.IsCompleted,
            Score = a.Score,
            MaxScore = a.MaxScore,
            UserName = a.User?.FullName ?? a.User?.UserName ?? "Unknown"
        });
    }

    public async Task<AttemptResultDto> GetAttemptDetailAsync(int attemptId)
    {
        return await BuildResultDto(attemptId);
    }

    public async Task<int> GetTotalAttemptsCountAsync()
    {
        return await _db.TestAttempts.CountAsync();
    }

    private async Task<AttemptResultDto> BuildResultDto(int attemptId)
    {
        var attempt = await _attemptRepository.GetWithDetailsAsync(attemptId);
        if (attempt == null) throw new KeyNotFoundException("Attempt not found.");

        return new AttemptResultDto
        {
            AttemptId = attempt.Id,
            TestId = attempt.TestId,
            TestTitle = attempt.Test.Title,
            UserName = attempt.User?.FullName ?? attempt.User?.UserName ?? "Unknown",
            UserId = attempt.UserId,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt,
            CompletedAt = attempt.CompletedAt,
            Score = attempt.Score,
            MaxScore = attempt.MaxScore,
            PassingScorePercent = attempt.Test.PassingScorePercent,
            ShowResultsImmediately = attempt.Test.ShowResultsImmediately,
            ShowCorrectAnswers = attempt.Test.ShowCorrectAnswers,
            AllowReview = attempt.Test.AllowReview,
            Questions = attempt.Answers.Select(ans => new QuestionResultDto
            {
                QuestionId = ans.QuestionId,
                QuestionText = ans.Question.Text,
                ImagePath = ans.Question.ImagePath,
                Type = ans.Question.Type,
                Weight = ans.Question.Weight,
                IsCorrect = ans.IsCorrect,
                ScoreAwarded = ans.ScoreAwarded,
                Explanation = ans.Question.Explanation,
                SelectedOptionIds = ans.SelectedOptions.Select(s => s.AnswerOptionId).ToList(),
                CorrectOptionIds = ans.Question.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList(),
                Options = ans.Question.Options.Select(o => new AnswerOptionResultDto
                {
                    Id = o.Id,
                    Text = o.Text,
                    IsCorrect = o.IsCorrect,
                    IsSelected = ans.SelectedOptions.Any(s => s.AnswerOptionId == o.Id)
                }).ToList()
            }).ToList()
        };
    }
}
