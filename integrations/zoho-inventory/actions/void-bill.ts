import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bill_id: z.string().describe('ID of the vendor bill to void. Example: "260815000000155147"'),
        organization_id: z.string().describe('Zoho Inventory organization ID the bill belongs to. Example: "927270289"')
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
    scopes: ['ZohoInventory.bills.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/bills/#mark-as-void
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}/status/void`,
            params: {
                organization_id: input.organization_id
            },
            // Voiding a bill is not idempotent: a retry after a lost response would attempt a second void.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            bill_id: input.bill_id,
            status: 'void',
            message: data.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
