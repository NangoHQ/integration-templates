import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form that owns the question. Example: "262715780901055"'),
        question_id: z.string().describe('Numeric qid of the existing question to edit. Run list-form-questions on the form to discover qids. Example: "3"'),
        properties: z
            .record(z.string(), z.string())
            .describe(
                'Question properties to set, keyed by Jotform property name. Example: { "text": "New label", "required": "Yes" }. Which properties exist depends on the field type of the question.'
            )
    })
    .describe('Input for editing an existing Jotform form question in place.');

const JotformEditResponseSchema = z.object({
    responseCode: z.number(),
    content: z.array(z.record(z.string(), z.string().nullable()))
});

const OutputSchema = z
    .object({
        question_id: z.string().describe('The qid of the question that was edited. Example: "3"'),
        type: z.string().describe('Control type of the edited question as echoed by Jotform. Example: "control_textbox"'),
        properties: z.record(z.string(), z.string()).describe('Properties applied to the question, as echoed back by Jotform. Example: { "text": "New label" }')
    })
    .describe('Result of editing a Jotform form question in place.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing form question's properties in place through the provider API; performs no reads and nothing irreversible.
 * @pitfalls: Jotform echoes back only the submitted properties rather than the full updated question, and it silently ignores property names it does not recognize, so the echoed output can list properties that were never actually applied; confirm type-specific edits via list-form-questions. A nonexistent form_id surfaces as a Jotform authorization error, not a not-found error.
 */
const action = createAction({
    description: "Edit an existing question's properties (e.g. its label text) in place, without creating a duplicate.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const entries = Object.entries(input.properties);
        if (entries.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'properties must include at least one question property to set.'
            });
        }

        // Jotform silently ignores POST bodies on this endpoint, so the question[...]
        // properties are sent as query-string params instead of a request body.
        const params: Record<string, string> = {};
        for (const [key, value] of entries) {
            params[`question[${key}]`] = value;
        }

        const response = await nango.post({
            // https://api.jotform.com/docs/#post-form-id-question-id
            endpoint: `/form/${encodeURIComponent(input.form_id)}/question/${encodeURIComponent(input.question_id)}`,
            params,
            // Re-applying the same property values is a no-op, so retrying this edit is safe.
            retries: 3
        });

        const parsed = JotformEditResponseSchema.parse(response.data);
        const echo = parsed.content[0];
        const type = echo?.['type'];

        if (!echo || type == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Question ${input.question_id} does not exist on form ${input.form_id}; nothing was edited.`,
                form_id: input.form_id,
                question_id: input.question_id
            });
        }

        const applied: Record<string, string> = {};
        for (const [key, value] of Object.entries(echo)) {
            if (key !== 'type' && value != null) {
                applied[key] = value;
            }
        }

        return {
            question_id: input.question_id,
            type,
            properties: applied
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
