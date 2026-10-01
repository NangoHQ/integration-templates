import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const QuestionInputSchema = z.object({
    type: z
        .string()
        .describe(
            'Jotform control type of the question to add. Example: "control_textbox", "control_textarea", "control_email", "control_fullname", "control_dropdown", "control_radio"'
        ),
    text: z.string().describe('Question label shown on the form. Example: "Your Name"'),
    name: z.string().optional().describe('Optional unique field name for the question. Jotform derives one from the label when omitted.'),
    order: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Optional 1-based position of the question on the form. The question is appended after existing questions when omitted.'),
    required: z.boolean().optional().describe('Whether an answer to the question is required. Defaults to false.')
});

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form to add the questions to. Example: "262715780901055"'),
        questions: z.array(QuestionInputSchema).min(1).describe('Questions to add to the form. At least one question is required.')
    })
    .describe('Input for adding one or more new questions to an existing Jotform form.');

const ProviderQuestionSchema = z.object({
    qid: z.union([z.string(), z.number()]),
    type: z.string(),
    text: z.string().optional(),
    name: z.string().optional(),
    order: z.union([z.string(), z.number()]).optional(),
    required: z.string().optional()
});

const ProviderResponseSchema = z.object({
    content: z.array(ProviderQuestionSchema)
});

const QuestionOutputSchema = z.object({
    qid: z.string().describe('Question ID assigned by Jotform. Example: "2"'),
    type: z.string().describe('Jotform control type of the added question. Example: "control_textbox"'),
    text: z.string().optional().describe('Question label shown on the form.'),
    name: z.string().optional().describe('Unique field name of the question, when set.'),
    order: z.string().optional().describe('1-based position of the question on the form. Example: "3"'),
    required: z.string().optional().describe('Whether an answer is required: "Yes" or "No".')
});

const OutputSchema = z
    .object({
        questions: z.array(QuestionOutputSchema).describe('The questions that were added to the form, including their assigned question IDs.')
    })
    .describe('Result of adding questions to a Jotform form.');

/**
 * @tags: [write]
 * @tagReason: Adds new questions to a form, which mutates the form's structure on Jotform.
 * @pitfalls: Jotform assigns question IDs (qids) itself and never reuses a deleted qid on the same form, so returned qids cannot be chosen and may be non-contiguous.
 */
const action = createAction({
    description: 'Add one or more new questions/fields to an existing form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fields: Record<string, string> = {};
        input.questions.forEach((question, index) => {
            const key = `questions[${index}]`;
            fields[`${key}[type]`] = question.type;
            fields[`${key}[text]`] = question.text;
            if (question.name !== undefined) {
                fields[`${key}[name]`] = question.name;
            }
            if (question.order !== undefined) {
                fields[`${key}[order]`] = String(question.order);
            }
            if (question.required !== undefined) {
                fields[`${key}[required]`] = question.required ? 'Yes' : 'No';
            }
        });

        // Jotform only reads bracketed question params from a form-urlencoded request body on this endpoint,
        // and the Nango proxy forwards a pre-serialized string body unchanged, so serialize it manually.
        const data = Object.entries(fields)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#put-form-id-questions
            endpoint: `/form/${encodeURIComponent(input.form_id)}/questions`,
            data,
            // Adding questions is not idempotent: retrying after a lost response would create duplicate questions.
            retries: 10
        };
        const response = await nango.put(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            questions: parsed.content.map((question) => ({
                qid: String(question.qid),
                type: question.type,
                ...(question.text !== undefined && { text: question.text }),
                ...(question.name !== undefined && { name: question.name }),
                ...(question.order !== undefined && { order: String(question.order) }),
                ...(question.required !== undefined && { required: question.required })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
