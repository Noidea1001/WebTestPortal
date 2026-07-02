using WebTestPortal.Models;

namespace WebTestPortal.DTOs;

// ---------- Starting an attempt ----------
public class AttemptStartedDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public DateTime? DeadlineUtc { get; set; }
    public List<QuestionStudentDto> Questions { get; set; } = new();

    /// <summary>Draft answers restored from a previous autosave, if this attempt was already in progress.</summary>
    public List<SubmitAnswerDto> DraftAnswers { get; set; } = new();
    public DateTime? LastAutoSavedAt { get; set; }

    /// <summary>Question IDs flagged for review, restored from a previous autosave. Persisted
    /// server-side so flags survive a refresh or the student saving/exiting mid-test as a draft.</summary>
    public List<int> FlaggedQuestionIds { get; set; } = new();
}

// ---------- Autosaving an in-progress attempt ----------
public class AutoSaveResultDto
{
    public DateTime SavedAtUtc { get; set; }
} // <-- ត្រង់នេះកាលពីមុនខ្វះសញ្ញាបិទមួយនេះ

// ---------- Submitting an attempt ----------
public class SubmitAnswerDto
{
    public int QuestionId { get; set; }
    public List<int> SelectedOptionIds { get; set; } = new();
}

public class SubmitAttemptDto
{
    public List<SubmitAnswerDto> Answers { get; set; } = new();

    /// <summary>Question IDs currently flagged for review. Sent on every autosave call so the
    /// flag state is explicitly persisted server-side (not just in the browser's localStorage)
    /// and never silently reverts when the student saves/exits as a draft. Ignored on final
    /// submit — flags are cleared once an attempt is actually submitted.</summary>
    public List<int>? FlaggedQuestionIds { get; set; }
}

// ---------- Result view ----------
public class AnswerOptionResultDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public bool IsSelected { get; set; }
}

public class QuestionResultDto
{
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? ImagePath { get; set; }
    public QuestionType Type { get; set; }
    public double Weight { get; set; }
    public bool IsCorrect { get; set; }
    public double ScoreAwarded { get; set; }
    public string? Explanation { get; set; }
    public List<int> SelectedOptionIds { get; set; } = new();
    public List<int> CorrectOptionIds { get; set; } = new();
    public List<AnswerOptionResultDto> Options { get; set; } = new();
}

public class AttemptResultDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public int? UserId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double Score { get; set; }
    public double MaxScore { get; set; }
    public double Percentage => MaxScore <= 0 ? 0 : Math.Round(Score / MaxScore * 100, 1);
    public double? PassingScorePercent { get; set; }
    public bool ShowResultsImmediately { get; set; }
    public bool ShowCorrectAnswers { get; set; }
    public bool AllowReview { get; set; }
    public List<QuestionResultDto> Questions { get; set; } = new();
}

public class AttemptSummaryDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsCompleted { get; set; }
    public double Score { get; set; }
    public double MaxScore { get; set; }
    public string? UserName { get; set; }
}

public class TestResultSummaryDto
{
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public double AverageScore { get; set; }
    public double AveragePercentage { get; set; }
    /// <summary>Earliest attempt start date for this test (used for date-range filtering in the UI).</summary>
    public DateTime? EarliestAttemptAt { get; set; }
    /// <summary>Latest attempt start date for this test.</summary>
    public DateTime? LatestAttemptAt { get; set; }
    /// <summary>Serialised list of all attempt years available (distinct, sorted) for client-side dropdowns.</summary>
    public List<int> AttemptYears { get; set; } = new();
}