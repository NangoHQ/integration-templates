import { z } from 'zod';
import { createAction } from 'nango';

const Wbs1ItemSchema = z.object({
    contract_wbs1_id: z.string().describe('WBS1 line item ID from the contract. Example: "6a71df4b92e09607f906dc09"'),
    value: z.string().describe('Invoice value for this WBS1 line item. Example: "100.00"')
});

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    contract_id: z.string().describe('Contract ID. Example: "6a71df4b92e09607f906dc08"'),
    status: z.enum(['draft', 'fully-approved', 'paid']).describe('Invoice status. Example: "draft"'),
    wbs1: z.array(Wbs1ItemSchema).describe('WBS1 line items to invoice'),
    items: z.array(z.unknown()).optional().describe('Additional invoice items')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a new AP invoice against a contract',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/v2-create-contracted-invoicepub.md
            endpoint: '/api/v2/pub/contracted-invoices',
            data: {
                project_id: input.project_id,
                contract_id: input.contract_id,
                status: input.status,
                wbs1: input.wbs1,
                items: input.items ?? []
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate AP invoice on a transient failure.
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
