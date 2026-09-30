import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        submission_id: z.string().describe('ID of the submission to retrieve. Example: "6665953522666321061"')
    })
    .describe('Input for retrieving a single Jotform submission');

const AnswerSchema = z
    .object({
        name: z.string().describe('Internal field name of the question on the form. Example: "q3_email1"'),
        text: z.string().describe('Label text of the question as displayed on the form. Example: "Email Address"'),
        type: z.string().describe('Jotform field type of the question. Examples: "control_fullname", "control_email", "control_textbox"'),
        answer: z
            .unknown()
            .optional()
            .describe(
                'Recorded answer for the question. A string for simple fields, an object keyed by sub-labels for compound fields (e.g. {"first": "Jane", "last": "Doe"} for a full name field), or an array for multi-value fields such as file uploads. Omitted when the question was not answered.'
            )
    })
    .describe('A single question on the form with its recorded answer, if any');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the submission. Example: "6665953522666321061"'),
        form_id: z.string().describe('ID of the form the submission belongs to. Example: "262715780901055"'),
        status: z.string().describe('Status of the submission. Example: "ACTIVE"'),
        created_at: z.string().describe('Creation timestamp of the submission in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-09-30 12:35:52"'),
        answers: z
            .record(z.string(), AnswerSchema)
            .describe(
                "All questions on the form with their recorded answers, keyed by the question's numeric qid. Questions the submitter did not answer appear with their metadata but no answer value."
            )
    })
    .describe('A single Jotform submission with its recorded answers');

const ProviderAnswerSchema = z
    .object({
        name: z.string(),
        text: z.string(),
        type: z.string(),
        answer: z.unknown().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    content: z.object({
        id: z.string(),
        form_id: z.string(),
        status: z.string(),
        created_at: z.string(),
        answers: z.record(z.string(), ProviderAnswerSchema)
    })
});

/**
 * @tags: [read]
 * @tagReason: Only reads a single submission from the provider without modifying any data.
 * @pitfalls: Jotform returns a 401 "not authorized" error instead of a 404 when the submission ID does not exist or is not accessible to the connected API key, so an auth-looking failure can simply mean the submission was not found.
 */
const action = createAction({
    description: "Retrieve a single submission's recorded answers",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#submission-id
            endpoint: `/submission/${encodeURIComponent(input.submission_id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const content = parsed.content;

        const answers: Record<string, z.infer<typeof AnswerSchema>> = {};
        for (const [qid, question] of Object.entries(content.answers)) {
            answers[qid] = {
                name: question.name,
                text: question.text,
                type: question.type,
                ...(question.answer !== null && question.answer !== undefined && { answer: question.answer })
            };
        }

        return {
            id: content.id,
            form_id: content.form_id,
            status: content.status,
            created_at: content.created_at,
            answers
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
