import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        vendor_id: z.string().describe('The unique identifier of the vendor to permanently delete. Example: "c0288977-3ea6-4a24-9116-7971e8da005a"')
    })
    .describe('Identifies the vendor to permanently delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the vendor was permanently deleted.'),
        vendor_id: z.string().describe('The identifier of the vendor that was deleted.')
    })
    .describe('Confirms the vendor was permanently deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a vendor in the provider. This is a difficult-to-reverse mutation.
 * @pitfalls: Deletion is permanent and cannot be undone, and it is rejected when the vendor has associated transactions, bills, contracts, spend requests, or child vendors.
 */
const action = createAction({
    description: 'Permanently delete a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vendors:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/api-reference/vendors/delete-a-vendor
        await nango.delete({
            endpoint: `/developer/v1/vendors/${encodeURIComponent(input.vendor_id)}`,
            // Not idempotent: replaying a delete whose response was lost fails with 404 DEVELOPER_7002 "does not exist", so retries must stay at 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            success: true,
            vendor_id: input.vendor_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
