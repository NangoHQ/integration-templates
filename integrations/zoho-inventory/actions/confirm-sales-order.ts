import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('Unique identifier of the sales order. Example: "260815000000155107"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the sales order to confirm and, optionally, the organization it belongs to.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Provider status code. 0 indicates success.'),
        message: z.string().describe('Provider status message. Example: "Sales order status has been changed to Confirmed."')
    })
    .describe('Result of the sales order confirmation request.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list to resolve the target organization when none is supplied, then mutates the sales order by transitioning it to confirmed.
 * @pitfalls: After a successful confirmation the workflow field order_status becomes "confirmed", but the separate top-level status rollup reflects fulfillment instead and can read differently (for example "fulfilled"), so do not use status alone to detect confirmation. Re-confirming an already-confirmed order also succeeds without error rather than being rejected as a duplicate.
 */
const action = createAction({
    description: 'Transition a draft sales order to confirmed status, making it ready for fulfillment/invoicing.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/salesorders/#mark-as-confirmed
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}/status/confirmed`,
            params: {
                organization_id: organizationId
            },
            // Idempotent in effect: re-confirming an already-confirmed order returns the same success response, so a bounded retry is safe.
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when confirming a sales order.',
                details: parsed.error.message
            });
        }

        const providerResponse = parsed.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: providerResponse.message, code: providerResponse.code });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
