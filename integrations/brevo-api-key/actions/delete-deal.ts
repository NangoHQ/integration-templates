import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        dealId: z.string().min(1).describe('The ID of the deal to delete. Deal IDs are 24-character hexadecimal strings. Example: "65f1a2b3c4d5e6f7a8b9c0d1"')
    })
    .describe('Input for deleting a Brevo CRM deal');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the deal was successfully deleted'),
        id: z.string().describe('The ID of the deleted deal')
    })
    .describe('Confirmation of the deal deletion');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a CRM deal through the provider API, an irreversible destructive mutation.
 * @pitfalls: Deletion is permanent and cannot be undone. The requesting user must be the deal owner or have manage permission on deals, otherwise the call fails with a 403. Deleting a deal that still has linked contacts or companies succeeds without unlinking them first.
 */
const action = createAction({
    description: 'Delete a deal',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/delete-a-deal
        await nango.delete({
            endpoint: `/crm/deals/${encodeURIComponent(input.dealId)}`,
            // Not retried: a retry after a lost 204 response would 404 on the already-deleted deal and surface a false failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            success: true,
            id: input.dealId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
