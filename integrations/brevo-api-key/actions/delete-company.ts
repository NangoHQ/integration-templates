import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('ID of the company to delete. Company IDs are 24-character hexadecimal strings. Example: "5f3b2a1c9d1e2f3a4b5c6d7e"')
    })
    .describe('Input for deleting a company');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the provider confirmed the company was deleted (HTTP 204)')
    })
    .describe('Result of the delete company request');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a company in the provider, a mutation that cannot be reversed, and performs no provider reads.
 * @pitfalls: Deletion is permanent and cannot be undone. The connected account must be the company owner or have manage permission on companies, otherwise the provider returns 403. Deleting a company that no longer exists returns 404 rather than succeeding silently, so re-running the delete on the same ID errors.
 */
const action = createAction({
    description: 'Delete a company.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/delete_companies-id
        await nango.delete({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            // Not retried: a retry after a lost 204 response would 404 on the already-deleted company and surface a false failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
