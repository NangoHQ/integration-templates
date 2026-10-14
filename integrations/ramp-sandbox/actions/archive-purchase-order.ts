import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        purchase_order_id: z.string().describe('The unique identifier of the purchase order to archive. Example: "01a139ea-1cb3-7c62-b234-c368a1c4d404"'),
        archived_reason: z
            .string()
            .nullable()
            .optional()
            .describe('Optional free-text reason for archiving the purchase order. Set to null to submit no reason.')
    })
    .describe('Input identifying the purchase order to archive and an optional reason.');

const OutputSchema = z
    .object({
        purchase_order_id: z.string().describe('The ID of the purchase order that was archived.'),
        archived: z.boolean().describe('True when the purchase order was successfully archived.')
    })
    .describe('Confirmation that the purchase order was archived.');

/**
 * @tags: [write, destructive]
 * @tagReason: Archives a purchase order, a provider mutation that permanently removes it from the account.
 * @pitfalls: Despite the name, archiving is an irreversible removal: the purchase order becomes unretrievable and cannot be restored, and archiving an already-archived or non-existent purchase order fails with a not-found error.
 */
const action = createAction({
    description: 'Archive (soft-remove) a purchase order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_orders:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json (operation: post_purchase_order_archive_resource)
        await nango.post({
            endpoint: `/developer/v1/purchase-orders/${encodeURIComponent(input.purchase_order_id)}/archive`,
            data: input.archived_reason !== undefined ? { archived_reason: input.archived_reason } : {},
            // Archiving is not idempotent: a retry after a lost 204 response would hit an already-archived order and fail with 404.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            purchase_order_id: input.purchase_order_id,
            archived: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
