using System.ComponentModel.DataAnnotations;
using WebTestPortal.Models;

namespace WebTestPortal.DTOs;

// ---------- Admin: create/update a test ----------
public class TestUpsertDto
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Range(1, 100)]
    public int MaxAttempts { get; set; } = 1;

    [Range(0, 10080, ErrorMessage = "Time limit must be between 0 and 1440 minutes.")]
    public int? TimeLimitMinutes { get; set; }

    /// <summary>When true, each student attempt gets its own randomized question order.</summary>
    public bool ShuffleQuestions { get; set; } = true;

    /// <summary>When true, each student attempt gets its own randomized answer-option order per question.</summary>
    public bool ShuffleOptions { get; set; } = true;

    /// <summary>Minimum percentage score required to pass (0–100). Null means no threshold.</summary>
    [Range(0, 100)]
    public double? PassingScorePercent { get; set; }

    public bool ShowResultsImmediately { get; set; } = true;
    public bool ShowCorrectAnswers { get; set; } = true;
    public bool AllowReview { get; set; } = true;
}

// ---------- Admin: create/update a question ----------
public class AnswerOptionUpsertDto
{
    public int? Id { get; set; } // present when updating an existing option

    [Required]
    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int OrderIndex { get; set; }
}

public class QuestionUpsertDto
{
    public int? Id { get; set; } // present when updating an existing question

    [Required]
    public string Text { get; set; } = string.Empty;

    public QuestionType Type { get; set; } = QuestionType.SingleChoice;

    [Range(0.1, 1000)]
    public double Weight { get; set; } = 1.0;

    public int OrderIndex { get; set; }

    public string? ImagePath { get; set; }

    public string? Subject { get; set; }

    public string? Difficulty { get; set; }

    public string? Explanation { get; set; }

    public bool IsActive { get; set; } = true;

    [MinLength(2, ErrorMessage = "A question needs at least two answer options.")]
    public List<AnswerOptionUpsertDto> Options { get; set; } = new();
}

// ---------- List / summary views ----------
public class TestSummaryDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MaxAttempts { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public bool IsPublished { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
}

// ---------- Admin detail view (includes correct answers, for editing) ----------
public class AnswerOptionAdminDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class QuestionAdminDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? ImagePath { get; set; }
    public QuestionType Type { get; set; }
    public double Weight { get; set; }
    public int OrderIndex { get; set; }
    public string? Subject { get; set; }
    public string? Difficulty { get; set; }
    public string? Explanation { get; set; }
    public bool IsActive { get; set; } = true;
    public List<AnswerOptionAdminDto> Options { get; set; } = new();

    /// <summary>True if at least one student has already answered this question in an attempt.
    /// Editing/deleting is blocked in that case to protect grading integrity.</summary>
    public bool HasAttempts { get; set; }

    /// <summary>When the question was first created (UTC). Client formats this to the
    /// viewer's local timezone/locale — never render this raw.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>When the question was last edited (UTC), if ever.</summary>
    public DateTime? UpdatedAt { get; set; }
}

public class TestAdminDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MaxAttempts { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public bool IsPublished { get; set; }
    public bool ShuffleQuestions { get; set; }
    public bool ShuffleOptions { get; set; }
    public double? PassingScorePercent { get; set; }
    public bool ShowResultsImmediately { get; set; }
    public bool ShowCorrectAnswers { get; set; }
    public bool AllowReview { get; set; }
    public List<QuestionAdminDto> Questions { get; set; } = new();
}

// ---------- Student-facing view (no correct-answer flags) ----------
public class AnswerOptionStudentDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}

public class QuestionStudentDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? ImagePath { get; set; }
    public QuestionType Type { get; set; }
    public double Weight { get; set; }
    public int OrderIndex { get; set; }
    public string? Subject { get; set; }
    public string? Difficulty { get; set; }
    public List<AnswerOptionStudentDto> Options { get; set; } = new();
}

public class AvailableTestDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public int MaxAttempts { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public int AttemptsUsed { get; set; }
    public bool CanAttempt { get; set; }
    public double? PassingScorePercent { get; set; }
}
