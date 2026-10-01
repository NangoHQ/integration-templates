import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form containing the question to delete. Example: "31974353596870"'),
        question_id: z.string().describe('ID (qid) of the question to delete from the form. Use the form questions endpoint to discover qids. Example: "2"')
    })
    .describe('Input for deleting a question from a form');

const OutputSchema = z
    .object({
        message: z.string().describe('Confirmation message returned by Jotform. Example: "QuestionID #2 successfully deleted."')
    })
    .describe('Result of deleting the question');

const JotformDeleteQuestionResponseSchema = z.object({
    content: z.string().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a single question/field from a form through the Jotform API.
 * @pitfalls: Question IDs are never reused, so a field added after a delete always receives a new auto-assigned qid rather than the deleted one. The connected Jotform API key must have Full Access; Read Access keys are rejected for write operations.
 */
const action = createAction({
    description: 'Permanently delete a single question/field from a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/ - DELETE /form/{id}/question/{qid}
        const response = await nango.delete({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/question/${encodeURIComponent(input.question_id)}`,
            // Not idempotent: a retry after a lost-but-successful response would repeat the delete against an already-deleted question.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate here; the rule's auto-fix would otherwise force a positive value
            retries: 0
        });

        const parsed = JotformDeleteQuestionResponseSchema.parse(response.data);

        if (!parsed.content) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Jotform did not return a deletion confirmation.',
                form_id: input.form_id,
                question_id: input.question_id
            });
        }

        return {
            message: parsed.content
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
