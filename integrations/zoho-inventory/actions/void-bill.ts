import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        bill_id: z.string().describe('ID of the vendor bill to void. Example: "260815000000155147"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the vendor bill to void and the organization it belongs to.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('ID of the bill that was voided.'),
        status: z.string().describe('Status of the bill after voiding; always "void".'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of voiding the vendor bill.');

/**
 * @tags: [write, destructive]
 * @tagReason: Voids a vendor bill, mutating its status to void and invalidating it for payment and reporting.
 * @pitfalls: Voiding changes the bill's status rather than deleting it, so the record remains in the organization; voiding an already-void bill or an unknown ID returns a provider error instead of succeeding idempotently.
 */
const action = createAction({
    description: 'Void a vendor bill in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/bills/#mark-as-void
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}/status/void`,
            params: {
                organization_id: organizationId
            },
            // Voiding a bill is not idempotent: a retry after a lost response would attempt a second void.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when voiding a bill.',
                details: parsed.error.message
            });
        }

        const data = parsed.data;

        if (data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: data.message, code: data.code });
        }

        return {
            bill_id: input.bill_id,
            status: 'void',
            message: data.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
