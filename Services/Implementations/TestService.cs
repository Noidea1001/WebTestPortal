using Microsoft.EntityFrameworkCore;
using WebTestPortal.Data;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Services.Implementations;

public class TestService : ITestService
{
    private readonly ITestRepository _testRepository;
    private readonly IQuestionRepository _questionRepository;
    private readonly IFileStorageService _fileStorage;
    private readonly AppDbContext _db;

    private readonly ILogger<TestService> _logger;

    public TestService(ITestRepository testRepository, IQuestionRepository questionRepository, IFileStorageService fileStorage, AppDbContext db, ILogger<TestService> logger)
    {
        _testRepository = testRepository;
        _questionRepository = questionRepository;
        _fileStorage = fileStorage;
        _db = db;
        _logger = logger;
    }

    private static readonly string[] AllowedExtensions = { ".png", ".jpg", ".jpeg", ".gif", ".webp" };

    public async Task<IEnumerable<TestSummaryDto>> GetMyTestsAsync(int userId)
    {
        var tests = await _testRepository.GetByCreatorAsync(userId);
        return tests.Select(t => new TestSummaryDto
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            MaxAttempts = t.MaxAttempts,
            TimeLimitMinutes = t.TimeLimitMinutes,
            IsPublished = t.IsPublished,
            QuestionCount = t.Questions.Count,
            CreatedAt = t.CreatedAt,
            CreatedByUsername = t.CreatedBy.UserName ?? "Unknown"
        });
    }

    public async Task<TestAdminDetailDto?> GetTestDetailAsync(int userId, int id)
    {
        var test = await _testRepository.GetByCreatorAndIdAsync(userId, id);
        if (test == null) return null;

        var attemptedQuestionIds = await _db.AttemptAnswers
            .Where(a => a.Question.TestId == id)
            .Select(a => a.QuestionId)
            .Distinct()
            .ToListAsync();
        var attemptedSet = attemptedQuestionIds.ToHashSet();

        return new TestAdminDetailDto
        {
            Id = test.Id,
            Title = test.Title,
            Description = test.Description,
            MaxAttempts = test.MaxAttempts,
            TimeLimitMinutes = test.TimeLimitMinutes,
            IsPublished = test.IsPublished,
            ShuffleQuestions = test.ShuffleQuestions,
            ShuffleOptions = test.ShuffleOptions,
            PassingScorePercent = test.PassingScorePercent,
            ShowResultsImmediately = test.ShowResultsImmediately,
            ShowCorrectAnswers = test.ShowCorrectAnswers,
            AllowReview = test.AllowReview,
            Questions = test.Questions.Select(q => ToAdminQuestionDto(q, attemptedSet)).ToList()
        };
    }

    public async Task<Test> CreateTestAsync(int userId, TestUpsertDto dto)
    {
        var test = new Test
        {
            Title = dto.Title,
            Description = dto.Description ?? string.Empty,
            MaxAttempts = dto.MaxAttempts,
            TimeLimitMinutes = dto.TimeLimitMinutes.GetValueOrDefault() > 0 ? dto.TimeLimitMinutes : null,
            ShuffleQuestions = dto.ShuffleQuestions,
            ShuffleOptions = dto.ShuffleOptions,
            PassingScorePercent = dto.PassingScorePercent,
            ShowResultsImmediately = dto.ShowResultsImmediately,
            ShowCorrectAnswers = dto.ShowCorrectAnswers,
            AllowReview = dto.AllowReview,
            IsPublished = false,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _testRepository.AddAsync(test);
        await _db.SaveChangesAsync();
        return test;
    }

    public async Task UpdateTestMetadataAsync(int userId, int id, TestUpsertDto dto)
    {
        var test = await _testRepository.GetByCreatorAndIdAsync(userId, id);
        if (test == null) throw new KeyNotFoundException("Test not found.");

        if (string.IsNullOrWhiteSpace(dto.Title)) throw new ArgumentException("Title is required.");
        if (dto.MaxAttempts < 1 || dto.MaxAttempts > 100) throw new ArgumentOutOfRangeException("MaxAttempts must be between 1 and 100.");
        if (dto.TimeLimitMinutes is < 0 or > 10080) throw new ArgumentOutOfRangeException("TimeLimitMinutes must be between 0 and 10080.");

        test.Title = dto.Title;
        test.Description = dto.Description ?? string.Empty;
        test.MaxAttempts = dto.MaxAttempts;
        test.TimeLimitMinutes = dto.TimeLimitMinutes.GetValueOrDefault() > 0 ? dto.TimeLimitMinutes : null;
        test.ShuffleQuestions = dto.ShuffleQuestions;
        test.ShuffleOptions = dto.ShuffleOptions;
        test.PassingScorePercent = dto.PassingScorePercent;
        test.ShowResultsImmediately = dto.ShowResultsImmediately;
        test.ShowCorrectAnswers = dto.ShowCorrectAnswers;
        test.AllowReview = dto.AllowReview;

        await _testRepository.UpdateAsync(test);
        await _db.SaveChangesAsync();
    }

    public async Task PublishTestAsync(int userId, int id, bool publish)
    {
        var test = await _testRepository.GetByCreatorAndIdAsync(userId, id);
        if (test == null) throw new KeyNotFoundException("Test not found.");

        if (publish)
        {
            var questions = await _questionRepository.GetByTestAsync(id);
            if (!questions.Any())
            {
                throw new InvalidOperationException("Add at least one question before publishing.");
            }
        }

        test.IsPublished = publish;
        await _testRepository.UpdateAsync(test);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteTestAsync(int userId, int id)
    {
        var test = await _testRepository.GetByCreatorAndIdAsync(userId, id);
        if (test == null) throw new KeyNotFoundException("Test not found.");

        try
        {
            using (var tx = await _db.Database.BeginTransactionAsync())
            {
                // Delete attempts and nested data first
                var attempts = await _db.TestAttempts
                    .Where(a => a.TestId == id)
                    .Include(a => a.Answers)
                        .ThenInclude(ans => ans.SelectedOptions)
                    .ToListAsync();

                foreach (var att in attempts)
                {
                    var selected = att.Answers.SelectMany(a => a.SelectedOptions).ToList();
                    if (selected.Any()) _db.Set<SelectedAnswerOption>().RemoveRange(selected);

                    if (att.Answers.Any()) _db.AttemptAnswers.RemoveRange(att.Answers);
                }

                if (attempts.Any()) _db.TestAttempts.RemoveRange(attempts);

                // Remove question options and questions
                var questions = await _db.Questions
                    .Where(q => q.TestId == id)
                    .Include(q => q.Options)
                    .ToListAsync();

                foreach (var q in questions)
                {
                    if (q.Options.Any()) _db.AnswerOptions.RemoveRange(q.Options);
                }
                if (questions.Any()) _db.Questions.RemoveRange(questions);

                // Finally remove the test
                _db.Tests.Remove(test);

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting test {TestId} by user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<Question> AddQuestionAsync(int userId, int testId, QuestionUpsertDto dto)
    {
        ValidateOptions(dto);

        var question = new Question
        {
            TestId = testId,
            Text = dto.Text,
            Type = dto.Type,
            Weight = dto.Weight,
            OrderIndex = dto.OrderIndex,
            ImagePath = dto.ImagePath,
            Subject = dto.Subject,
            Difficulty = dto.Difficulty,
            Explanation = dto.Explanation,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            Options = dto.Options.Select(o => new AnswerOption
            {
                Text = o.Text,
                IsCorrect = o.IsCorrect,
                OrderIndex = o.OrderIndex
            }).ToList()
        };

        await _db.Questions.AddAsync(question);
        await _db.SaveChangesAsync();
        return question;
    }

    public async Task UpdateQuestionAsync(int userId, int testId, int questionId, QuestionUpsertDto dto)
    {
        var question = await _db.Questions
            .Include(q => q.Options)
            .Include(q => q.Test)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.TestId == testId && q.Test.CreatedByUserId == userId);

        if (question == null) throw new KeyNotFoundException("Question not found.");

        var hasAttempts = await _db.AttemptAnswers.AnyAsync(a => a.QuestionId == questionId);
        if (hasAttempts)
        {
            throw new InvalidOperationException("This question can't be edited because one or more students have already attempted it. Add a new question instead, or delete the test's attempts first if you really need to change it.");
        }

        ValidateOptions(dto);

        question.Text = dto.Text;
        question.Type = dto.Type;
        question.Weight = dto.Weight;
        question.OrderIndex = dto.OrderIndex;
        question.ImagePath = dto.ImagePath;
        question.Subject = dto.Subject;
        question.Difficulty = dto.Difficulty;
        question.Explanation = dto.Explanation;
        question.IsActive = dto.IsActive;
        question.UpdatedAt = DateTime.UtcNow;

        _db.AnswerOptions.RemoveRange(question.Options);
        question.Options = dto.Options.Select((o, idx) => new AnswerOption
        {
            Text = o.Text,
            IsCorrect = o.IsCorrect,
            OrderIndex = idx
        }).ToList();

        await _db.SaveChangesAsync();
    }

    public async Task DeleteQuestionAsync(int userId, int testId, int questionId)
    {
        var question = await _db.Questions
            .Include(q => q.Test)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.TestId == testId && q.Test.CreatedByUserId == userId);

        if (question == null) throw new KeyNotFoundException("Question not found.");

        var hasAttempts = await _db.AttemptAnswers.AnyAsync(a => a.QuestionId == questionId);
        if (hasAttempts)
        {
            throw new InvalidOperationException("This question can't be deleted because one or more students have already attempted it. Deleting it would erase their recorded answers.");
        }

        var options = await _db.AnswerOptions.Where(o => o.QuestionId == questionId).ToListAsync();
        if (options.Any()) _db.AnswerOptions.RemoveRange(options);

        _db.Questions.Remove(question);
        await _db.SaveChangesAsync();
    }

    public async Task<string?> UploadQuestionImageAsync(int userId, int testId, int questionId, string fileName, long fileLength, Stream fileStream)
    {
        var question = await _db.Questions
            .Include(q => q.Test)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.TestId == testId && q.Test.CreatedByUserId == userId);

        if (question == null) return null;

        var hasAttempts = await _db.AttemptAnswers.AnyAsync(a => a.QuestionId == questionId);
        if (hasAttempts)
        {
            throw new InvalidOperationException("This question's image can't be changed because one or more students have already attempted it.");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext)) return null;

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "questions");
        Directory.CreateDirectory(uploadsRoot);

        var newFileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadsRoot, newFileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
        }

        question.ImagePath = $"/uploads/questions/{newFileName}";
        await _db.SaveChangesAsync();

        return question.ImagePath;
    }

    public async Task<Test?> GetWithQuestionsAsync(int testId)
    {
        return await _db.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Options.OrderBy(o => o.OrderIndex))
            .Include(t => t.Attempts)
            .FirstOrDefaultAsync(t => t.Id == testId);
    }

    private static void ValidateOptions(QuestionUpsertDto dto)
    {
        if (dto.Options.Count < 2)
            throw new ArgumentException("A question needs at least two answer options.");

        var correctCount = dto.Options.Count(o => o.IsCorrect);
        if (correctCount == 0)
            throw new ArgumentException("At least one option must be marked correct.");

        if (dto.Type == QuestionType.SingleChoice && correctCount > 1)
            throw new ArgumentException("Single-choice questions can only have one correct option.");
    }

    private static TestAdminDetailDto ToAdminDetailDto(Test t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Description = t.Description,
        MaxAttempts = t.MaxAttempts,
        TimeLimitMinutes = t.TimeLimitMinutes,
        IsPublished = t.IsPublished,
        PassingScorePercent = t.PassingScorePercent,
        ShowResultsImmediately = t.ShowResultsImmediately,
        ShowCorrectAnswers = t.ShowCorrectAnswers,
        AllowReview = t.AllowReview,
        Questions = t.Questions.Select(q => ToAdminQuestionDto(q, new HashSet<int>())).ToList()
    };

    private static QuestionAdminDto ToAdminQuestionDto(Question q, HashSet<int> attemptedQuestionIds) => new()
    {
        Id = q.Id,
        Text = q.Text,
        ImagePath = q.ImagePath,
        Type = q.Type,
        Weight = q.Weight,
        OrderIndex = q.OrderIndex,
        Subject = q.Subject,
        Difficulty = q.Difficulty,
        Explanation = q.Explanation,
        IsActive = q.IsActive,
        HasAttempts = attemptedQuestionIds.Contains(q.Id),
        CreatedAt = q.CreatedAt,
        UpdatedAt = q.UpdatedAt,
        Options = q.Options.Select(o => new AnswerOptionAdminDto
        {
            Id = o.Id,
            Text = o.Text,
            IsCorrect = o.IsCorrect,
            OrderIndex = o.OrderIndex
        }).ToList()
    };
}
