using WebTestPortal.Models;

namespace WebTestPortal.Services;

/// <summary>
/// Encapsulates how a single answered question is graded.
/// Rule: a question is correct only if the student's selected option set is an EXACT
/// match of the correct option set (this applies to both single- and multiple-choice
/// questions). An exact match awards the full weight of the question; anything else
/// awards zero. This keeps grading simple and unambiguous for multi-select questions.
/// </summary>
public static class GradingService
{
    public static (bool isCorrect, double scoreAwarded) GradeAnswer(
        Question question,
        IEnumerable<int> selectedOptionIds)
    {
        var correctIds = question.Options
            .Where(o => o.IsCorrect)
            .Select(o => o.Id)
            .ToHashSet();

        var selectedIds = selectedOptionIds.ToHashSet();

        bool isCorrect = correctIds.SetEquals(selectedIds);
        double scoreAwarded = isCorrect ? question.Weight : 0;

        return (isCorrect, scoreAwarded);
    }
}
