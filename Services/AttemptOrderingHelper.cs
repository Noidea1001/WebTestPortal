using System.Text.Json;
using WebTestPortal.DTOs;
using WebTestPortal.Models;

namespace WebTestPortal.Services;

/// <summary>
/// Encapsulates the "looks like a real exam" presentation concerns for an attempt:
///  - per-attempt randomization of question order and answer-option order (grading is always
///    keyed by option ID, never by position, so shuffling display order never affects scoring)
///  - reading/writing the autosaved draft answers used to restore progress on resume
/// The random order is generated once when an attempt starts and stored on the TestAttempt row,
/// so refreshing the page or resuming later always shows the same order to that student.
/// </summary>
public static class AttemptOrderingHelper
{
    /// <summary>Builds a fresh shuffled (or natural) question order for a brand-new attempt.</summary>
    public static string? GenerateQuestionOrder(Test test)
    {
        var ids = test.Questions.OrderBy(q => q.OrderIndex).Select(q => q.Id).ToList();
        if (test.ShuffleQuestions)
        {
            Shuffle(ids);
        }
        return JsonSerializer.Serialize(ids);
    }

    /// <summary>Builds a fresh shuffled (or natural) per-question option order for a brand-new attempt.</summary>
    public static string? GenerateOptionOrder(Test test)
    {
        var map = new Dictionary<int, List<int>>();
        foreach (var q in test.Questions)
        {
            var optionIds = q.Options.OrderBy(o => o.OrderIndex).Select(o => o.Id).ToList();
            if (test.ShuffleOptions)
            {
                Shuffle(optionIds);
            }
            map[q.Id] = optionIds;
        }
        return JsonSerializer.Serialize(map);
    }

    /// <summary>
    /// Returns the test's questions ordered the way this specific attempt should display them.
    /// Falls back to natural OrderIndex order for anything that isn't present in the stored
    /// order (e.g. a question added after the attempt started). Does not mutate the Question
    /// or AnswerOption entities themselves (so it's safe to call on EF-tracked instances).
    /// </summary>
    public static List<Question> OrderQuestionsForAttempt(Test test, TestAttempt attempt)
    {
        var allQuestions = test.Questions.OrderBy(q => q.OrderIndex).ToList();

        List<int>? questionOrder = null;
        if (!string.IsNullOrEmpty(attempt.QuestionOrderJson))
        {
            try { questionOrder = JsonSerializer.Deserialize<List<int>>(attempt.QuestionOrderJson); }
            catch (JsonException) { questionOrder = null; }
        }

        if (questionOrder == null || questionOrder.Count == 0)
        {
            return allQuestions;
        }

        var byId = allQuestions.ToDictionary(q => q.Id);
        var ordered = questionOrder.Where(byId.ContainsKey).Select(id => byId[id]).ToList();
        // Anything not covered by the stored order (e.g. added later) goes at the end.
        var coveredIds = ordered.Select(q => q.Id).ToHashSet();
        ordered.AddRange(allQuestions.Where(q => !coveredIds.Contains(q.Id)));
        return ordered;
    }

    /// <summary>Returns a question's answer options in the order this attempt should display them.</summary>
    public static List<AnswerOption> OrderOptionsForAttempt(Question question, TestAttempt attempt)
    {
        var allOptions = question.Options.OrderBy(o => o.OrderIndex).ToList();

        Dictionary<int, List<int>>? optionOrder = null;
        if (!string.IsNullOrEmpty(attempt.OptionOrderJson))
        {
            try { optionOrder = JsonSerializer.Deserialize<Dictionary<int, List<int>>>(attempt.OptionOrderJson); }
            catch (JsonException) { optionOrder = null; }
        }

        if (optionOrder == null || !optionOrder.TryGetValue(question.Id, out var orderIds) || orderIds.Count == 0)
        {
            return allOptions;
        }

        var byId = allOptions.ToDictionary(o => o.Id);
        var ordered = orderIds.Where(byId.ContainsKey).Select(id => byId[id]).ToList();
        var coveredIds = ordered.Select(o => o.Id).ToHashSet();
        ordered.AddRange(allOptions.Where(o => !coveredIds.Contains(o.Id)));
        return ordered;
    }

    /// <summary>Builds the student-facing question DTOs in this attempt's display order.</summary>
    public static List<QuestionStudentDto> BuildOrderedQuestionDtos(Test test, TestAttempt attempt)
    {
        return OrderQuestionsForAttempt(test, attempt).Select((q, qIdx) => new QuestionStudentDto
        {
            Id = q.Id,
            Text = q.Text,
            ImagePath = q.ImagePath,
            Type = q.Type,
            Weight = q.Weight,
            Subject = q.Subject,
            Difficulty = q.Difficulty,
            // Renumbered to match this attempt's shuffled position (rather than the question's
            // original authoring order), so any consumer that re-sorts by OrderIndex still
            // respects the randomized order shown to this student.
            OrderIndex = qIdx,
            Options = OrderOptionsForAttempt(q, attempt).Select((o, idx) => new AnswerOptionStudentDto
            {
                Id = o.Id,
                Text = o.Text,
                OrderIndex = idx
            }).ToList()
        }).ToList();
    }

    /// <summary>Parses the autosaved draft answers for an attempt into questionId -> selected option IDs.</summary>
    public static Dictionary<int, List<int>> ParseDraftAnswers(TestAttempt attempt)
    {
        if (string.IsNullOrEmpty(attempt.DraftAnswersJson)) return new();

        try
        {
            var list = JsonSerializer.Deserialize<List<SubmitAnswerDto>>(attempt.DraftAnswersJson);
            return list?.ToDictionary(a => a.QuestionId, a => a.SelectedOptionIds) ?? new();
        }
        catch (JsonException)
        {
            return new();
        }
    }

    /// <summary>Serializes a submitted/autosaved answer set for storage as a draft.</summary>
    public static string SerializeDraftAnswers(SubmitAttemptDto dto)
    {
        return JsonSerializer.Serialize(dto.Answers);
    }

    /// <summary>Parses the persisted set of flagged-for-review question IDs for an attempt.</summary>
    public static List<int> ParseFlaggedQuestionIds(TestAttempt attempt)
    {
        if (string.IsNullOrEmpty(attempt.FlaggedQuestionIdsJson)) return new();

        try
        {
            return JsonSerializer.Deserialize<List<int>>(attempt.FlaggedQuestionIdsJson) ?? new();
        }
        catch (JsonException)
        {
            return new();
        }
    }

    /// <summary>Serializes a set of flagged question IDs for storage.</summary>
    public static string SerializeFlaggedQuestionIds(List<int> flaggedQuestionIds)
    {
        return JsonSerializer.Serialize(flaggedQuestionIds.Distinct().ToList());
    }

    private static void Shuffle(List<int> list)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = Random.Shared.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
