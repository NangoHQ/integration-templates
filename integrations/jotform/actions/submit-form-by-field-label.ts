import { z } from 'zod';
import { createAction } from 'nango';

const FieldValueSchema = z
    .union([z.string(), z.record(z.string(), z.string())])
    .describe(
        'Answer for the field: a plain value for simple fields, or an object of sub-keyed values for compound fields (e.g. {"first": "Jane", "last": "Doe"} for a "Full Name" field). Sub-keys come from the question\'s sublabels in list-form-questions; either the machine key ("first") or its human label ("First Name") is accepted.'
    );

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the Jotform form to submit. Example: "262715780901055"'),
        fields: z
            .record(z.string(), FieldValueSchema)
            .describe(
                'Answers keyed by the question\'s human-readable label (its text, or internal name) exactly as returned by list-form-questions. Example: {"Email Address": "jane@example.com", "Full Name": {"first": "Jane", "last": "Doe"}}'
            )
    })
    .describe('Form submission expressed with human-readable field labels instead of numeric question IDs.');

const OutputSchema = z
    .object({
        submission_id: z.string().describe('ID of the created submission. Example: "6666847323816835506"'),
        url: z.string().describe('Canonical API URL of the created submission. Example: "https://api.jotform.com/submission/6666847323816835506"')
    })
    .describe('Identifiers of the created form submission.');

const QuestionSchema = z.object({
    qid: z.string(),
    text: z.string().optional(),
    name: z.string().optional(),
    sublabels: z.union([z.string(), z.record(z.string(), z.string())]).optional()
});

const QuestionsResponseSchema = z.object({
    content: z.union([z.record(z.string(), QuestionSchema), z.array(QuestionSchema)])
});

const SubmitResponseSchema = z.object({
    content: z.object({
        submissionID: z.union([z.string(), z.number()]),
        URL: z.string()
    })
});

type Question = z.infer<typeof QuestionSchema>;

function parseSublabels(raw: string | Record<string, string> | undefined): Record<string, string> | null {
    if (raw === undefined) {
        return null;
    }
    if (typeof raw !== 'string') {
        return raw;
    }
    // @allowTryCatch: sublabels can arrive as a JSON-encoded string; a malformed payload must not fail the whole submission, so fall back to no sub-key mapping.
    try {
        const parsed: unknown = JSON.parse(raw);
        const validated = z.record(z.string(), z.string()).safeParse(parsed);
        return validated.success ? validated.data : null;
    } catch {
        return null;
    }
}

function resolveSubKey(sublabels: Record<string, string> | null, subKey: string): string {
    if (sublabels === null || subKey in sublabels) {
        return subKey;
    }
    for (const [machineKey, humanLabel] of Object.entries(sublabels)) {
        if (humanLabel === subKey) {
            return machineKey;
        }
    }
    return subKey;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the form's questions to resolve field labels to question IDs, then creates a new submission on the form.
 * @pitfalls: Labels must exactly match a question's text (or internal name) from list-form-questions; an unmatched label aborts the call before anything is submitted, and duplicate labels resolve to the first matching question. Submissions are accepted without answering interactive fields such as CAPTCHA or payment widgets. Only the new submission's id and URL are returned - fetch the submission to read its recorded answers.
 */
const action = createAction({
    description: "Submit a form using human-readable field labels (resolved to question IDs via the form's questions) instead of numeric qids.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (Object.keys(input.fields).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'fields must contain at least one label-keyed answer; an empty object would create a blank submission.'
            });
        }

        // https://api.jotform.com/docs/#form-id-questions
        const questionsResponse = await nango.get({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/questions`,
            retries: 3
        });

        const parsedQuestions = QuestionsResponseSchema.parse(questionsResponse.data);
        const questions = Array.isArray(parsedQuestions.content) ? parsedQuestions.content : Object.values(parsedQuestions.content);

        const byLabel = new Map<string, Question>();
        const availableLabels: string[] = [];
        for (const question of questions) {
            const label = question.text ?? question.name;
            if (label !== undefined && !availableLabels.includes(label)) {
                availableLabels.push(label);
            }
            if (question.text !== undefined && !byLabel.has(question.text)) {
                byLabel.set(question.text, question);
            }
            if (question.name !== undefined && !byLabel.has(question.name)) {
                byLabel.set(question.name, question);
            }
        }

        // Jotform silently drops submission[...] params sent in the request body, so they must be sent as URL query string parameters.
        const queryParams: Record<string, string> = {};
        for (const [label, value] of Object.entries(input.fields)) {
            const question = byLabel.get(label);
            if (!question) {
                throw new nango.ActionError({
                    type: 'unknown_field_label',
                    message: `No question on this form matches the label "${label}". Available labels: ${availableLabels.join(', ')}`,
                    label,
                    available_labels: availableLabels
                });
            }
            if (typeof value === 'string') {
                queryParams[`submission[${question.qid}]`] = value;
            } else {
                const sublabels = parseSublabels(question.sublabels);
                for (const [subKey, subValue] of Object.entries(value)) {
                    queryParams[`submission[${question.qid}][${resolveSubKey(sublabels, subKey)}]`] = subValue;
                }
            }
        }

        // retries: 0 - creating a submission is not idempotent; a retry after a lost response would create a duplicate submission.
        // https://api.jotform.com/docs/#post-form-id-submissions
        const submitResponse = await nango.post({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/submissions`,
            params: queryParams,
            retries: 10
        });

        const parsedSubmit = SubmitResponseSchema.parse(submitResponse.data);

        return {
            submission_id: String(parsedSubmit.content.submissionID),
            url: parsedSubmit.content.URL
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
