namespace WebTestPortal.Models;

public class Question
{
    public int Id { get; set; }

    public int TestId { get; set; }
    public Test Test { get; set; } = null!;

    public string Text { get; set; } = string.Empty;

    // Relative path under wwwroot "/uploads/questions/abc123.png". Null when no image attached.
    public string? ImagePath { get; set; }

    public QuestionType Type { get; set; } = QuestionType.SingleChoice;

    // Each question carries its own weight towards the test's total score.
    public double Weight { get; set; } = 1.0;

    public int OrderIndex { get; set; }

    // Optional subject/topic classification for the question (e.g., "Mathematics", "History").
    public string? Subject { get; set; }

    // Difficulty level: "Easy", "Medium", "Hard". Null means unspecified.
    public string? Difficulty { get; set; }

    // Optional explanation shown to students after they submit the exam.
    public string? Explanation { get; set; }

    // Whether the question is active (visible in tests) or inactive (hidden from new tests).
    // Existing questions default to true.
    public bool IsActive { get; set; } = true;

    // When this question was first created (UTC). Displayed on the admin question card,
    // formatted client-side to the user's local timezone/locale.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // When this question was last edited (UTC). Null until the first edit after creation.
    public DateTime? UpdatedAt { get; set; }

    public ICollection<AnswerOption> Options { get; set; } = new List<AnswerOption>();
}
