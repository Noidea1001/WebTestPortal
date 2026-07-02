namespace WebTestPortal.Models;

public class TestAttempt
{
    public int Id { get; set; }

    public int TestId { get; set; }
    public Test Test { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // 1-based: which attempt number this is for this user on this test.
    public int AttemptNumber { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    public bool IsCompleted { get; set; }

    // Sum of weights for questions answered correctly.
    public double Score { get; set; }

    // Sum of weights for all questions in the test at the time it was taken.
    public double MaxScore { get; set; }

    // JSON-encoded list of question IDs, in the order shown to this student for this attempt
    // (set once when the attempt starts, so refreshing/resuming shows a stable order).
    public string? QuestionOrderJson { get; set; }

    // JSON-encoded dictionary of questionId -> ordered list of answer-option IDs, capturing
    // the per-question option order shown to this student for this attempt.
    public string? OptionOrderJson { get; set; }

    // JSON-encoded autosaved answers (same shape as SubmitAttemptDto.Answers) captured
    // periodically while the student is still working, so progress survives a refresh,
    // closed tab, or crash without requiring a real submit.
    public string? DraftAnswersJson { get; set; }

    // When the draft answers were last autosaved.
    public DateTime? LastAutoSavedAt { get; set; }

    // JSON-encoded list of question IDs the student has flagged for review during this attempt.
    // Persisted server-side (alongside the draft answers) so a flag survives autosave, a page
    // refresh, or the student saving/exiting mid-test as a draft — it only clears once the
    // attempt is actually submitted.
    public string? FlaggedQuestionIdsJson { get; set; }

    public ICollection<AttemptAnswer> Answers { get; set; } = new List<AttemptAnswer>();
}
