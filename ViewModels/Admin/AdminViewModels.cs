using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using WebTestPortal.DTOs;
using WebTestPortal.Models;

namespace WebTestPortal.ViewModels.Admin;

public class AdminDashboardViewModel
{
    public int TotalTests { get; set; }
    public int PublishedTests { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalUsers { get; set; }
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public double AverageScorePercentage { get; set; }
    public List<AttemptSummaryDto> RecentAttempts { get; set; } = new();
    public List<DailyAttemptCountDto> WeeklyAttemptVolume { get; set; } = new();
    public List<ScoreDistributionBucketDto> ScoreDistribution { get; set; } = new();
    public int PassCount { get; set; }
    public int FailCount { get; set; }
    public List<TestSummaryDto> RecentPublishedTests { get; set; } = new();
}

public class DailyAttemptCountDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

public class ScoreDistributionBucketDto
{
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TestsListViewModel
{
    public List<TestSummaryDto> Tests { get; set; } = new();
    public TestUpsertDto NewTest { get; set; } = new();
}

public class EditTestViewModel
{
    public TestAdminDetailDto Test { get; set; } = new();
}

public class QuestionFormViewModel
{
    public int? Id { get; set; }
    public int TestId { get; set; }

    [Required(ErrorMessage = "Question text is required.")]
    public string Text { get; set; } = string.Empty;

    public QuestionType Type { get; set; } = QuestionType.SingleChoice;

    [Range(0.1, 1000, ErrorMessage = "Weight must be between 0.1 and 1000.")]
    public double Weight { get; set; } = 1.0;

    public int OrderIndex { get; set; }
    public string? ExistingImagePath { get; set; }
    public IFormFile? ImageFile { get; set; }

    public List<AnswerOptionFormViewModel> Options { get; set; } = new();
}

public class AnswerOptionFormViewModel
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Option text is required.")]
    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class ResultsListViewModel
{
    public List<TestResultSummaryDto> TestResults { get; set; } = new();
}

public class TestResultsViewModel
{
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public List<AttemptSummaryDto> Attempts { get; set; } = new();
}

public class DeleteTestViewModel
{
    public WebTestPortal.DTOs.TestAdminDetailDto Test { get; set; } = new();
    public int AttemptCount { get; set; }
}

public class DeleteQuestionViewModel
{
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public int AttemptAnswerCount { get; set; }
}
