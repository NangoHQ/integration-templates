import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        submission_id: z.string().describe('The ID of the submission to retrieve. Example: "6665953522666321061"')
    })
    .describe('Input for retrieving a submission with its answers keyed by question label');

const SubmissionAnswerSchema = z.object({
    text: z.string().optional(),
    answer: z.unknown().optional()
});

const SubmissionResponseSchema = z.object({
    content: z.object({
        id: z.string(),
        form_id: z.string(),
        answers: z.record(z.string(), SubmissionAnswerSchema).optional()
    })
});

const QuestionsResponseSchema = z.object({
    // An empty question set comes back as an empty array instead of an object keyed by qid.
    content: z
        .union([z.record(z.string(), z.object({ text: z.string().optional() })), z.array(z.unknown()).length(0)])
        .transform((content) => (Array.isArray(content) ? {} : content))
});

const OutputSchema = z
    .record(
        z.string(),
        z
            .unknown()
            .describe(
                'The recorded answer for this question: a string for simple fields, an object of sub-label keys for compound fields (e.g. {"first": "Jane", "last": "Doe"} for a full name), or an array for multi-value fields'
            )
    )
    .describe(
        'The submission answers keyed by the question\'s human-readable label/text instead of its numeric qid, e.g. {"Email Address": "jane@example.com"}. Only questions that have a recorded answer are included.'
    );

/**
 * @tags: [read]
 * @tagReason: Both underlying calls are read-only GETs: fetching the submission, then fetching its form's questions to resolve labels.
 * @pitfalls: Output keys are the form's current question labels, so a question renamed after the submission appears under its new label, and if two questions share a label only one of their answers appears. A question whose recorded value is empty (such as a file upload with no files) is still included with that empty value.
 */
const action = createAction({
    description: "Retrieve a submission's answers re-keyed by human-readable question label/text instead of raw numeric qid",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/
        const submissionResponse = await nango.get({
            endpoint: `/submission/${encodeURIComponent(input.submission_id)}`,
            retries: 3
        });

        const submission = SubmissionResponseSchema.parse(submissionResponse.data);
        const answers = submission.content.answers ?? {};

        // https://api.jotform.com/docs/
        const questionsResponse = await nango.get({
            endpoint: `/form/${encodeURIComponent(submission.content.form_id)}/questions`,
            retries: 3
        });

        const questions = QuestionsResponseSchema.parse(questionsResponse.data);

        const output: Record<string, unknown> = {};
        for (const [qid, answerInfo] of Object.entries(answers)) {
            if (!('answer' in answerInfo)) {
                continue;
            }
            const label = questions.content[qid]?.text ?? answerInfo.text;
            if (!label) {
                continue;
            }
            output[label] = answerInfo.answer;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
