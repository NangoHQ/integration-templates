import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        submission_id: z.string().describe('The ID of the Jotform submission to delete. Example: "6665948653814244880"')
    })
    .describe('Input for permanently deleting a Jotform submission.');

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the submission that was deleted.'),
        message: z.string().describe('Confirmation message returned by Jotform. Example: "Submission #6665948653814244880 deleted successfully."')
    })
    .describe('Result of permanently deleting a Jotform submission.');

const DeleteSubmissionResponseSchema = z.object({
    responseCode: z.number(),
    message: z.string(),
    content: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a submission in Jotform, a provider mutation whose hard-delete effect cannot be reversed.
 * @pitfalls: Deletion is immediate and permanent; the submission and its answers are removed rather than flagged or archived. Deleting a submission that does not exist or was already deleted fails with a misleading authorization-style error instead of a not-found error.
 */
const action = createAction({
    description: 'Permanently delete a submission.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/ (DELETE /submission/{id})
        const response = await nango.delete({
            endpoint: `/submission/${encodeURIComponent(input.submission_id)}`,
            // Not idempotent: a retry after a lost-but-successful delete fails (see @pitfalls), masking the original success.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const result = DeleteSubmissionResponseSchema.parse(response.data);

        return {
            id: input.submission_id,
            message: result.content
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
