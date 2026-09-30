import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        opportunity_id: z.string().describe('GUID of the opportunity to delete. Example: "3f2504e0-4f89-41d3-9a0c-0305e82c3301"')
    })
    .describe('Input for deleting an opportunity');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the opportunity was deleted (the provider returned 204 No Content)')
    })
    .describe('Confirmation that the opportunity was deleted');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an opportunity record from Dataverse, which is a provider mutation that cannot be undone.
 * @pitfalls: Deletion is immediate and permanent; Dataverse exposes no soft-delete or recycle bin through this API. A missing or already-deleted id fails with a 404 error rather than returning success: false.
 */
const action = createAction({
    description: 'Delete an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
        await nango.delete({
            endpoint: `/api/data/v9.2/opportunities(${encodeURIComponent(input.opportunity_id)})`,
            // No retries: a retry after a lost 204 response would hit a 404 on the already-deleted record and mask the successful deletion.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate 0 for a non-idempotent destructive write; the rule fixer would otherwise rewrite it to 10.
            retries: 0
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
