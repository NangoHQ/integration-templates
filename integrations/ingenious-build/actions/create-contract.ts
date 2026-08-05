import { z } from 'zod';
import { createAction } from 'nango';

const Wbs1ItemSchema = z.object({
    name: z.string().describe('WBS line item name. Example: "Mobilization"'),
    total_value: z.union([z.string(), z.number()]).describe('Total value for this line item. Example: "1000.00"'),
    cost_code_id: z.string().describe('Valid budget cost code ID. Example: "6a71df3b92e09607f906dbda"'),
    site_id: z.string().optional().describe('Optional site ID. Example: "6a71de9d92e09607f906dbab"')
});

const InputSchema = z.object({
    name: z.string().describe('Contract name. Example: "Nango Test Contract"'),
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    status: z.enum(['draft', 'executed']).describe('Contract status. Example: "draft"'),
    initiation_date: z.string().describe('Initiation date in Y-m-d format. Example: "2026-08-04"'),
    effective_date: z.string().describe('Effective date in Y-m-d format. Example: "2026-08-04"'),
    contract_type: z.enum(['standard', 'gmp']).describe('Contract type. Example: "standard"'),
    vendor_contact_id: z.string().describe('Vendor contact ID. Example: "6a71ddac92e09607f906db64"'),
    client_contact_id: z.string().describe('Client contact ID. Example: "6a71ddc4f55241acad0cd422"'),
    wbs1: z.array(Wbs1ItemSchema).describe('WBS line items for the contract'),
    contract_holder: z.enum(['advisory', 'agency', 'principal', 'agency-bill-pay']).optional().describe('Contract holder. Example: "principal"'),
    agreement_type: z
        .enum(['advisory', 'agency', 'agency-bill-pay', 'agency-non-bill-pay', 'principal', 'undetermined'])
        .optional()
        .describe('Agreement type. Example: "principal"'),
    execution_note: z.string().optional().describe('Execution note. Example: "Test contract"'),
    custom_id: z.string().optional().describe('Custom contract ID. Example: "CUST-001"'),
    accounting_company_id: z.string().optional().describe('Accounting company ID. Example: "6a6b8337374668eea203ccb7"'),
    payment_term_id: z.string().optional().describe('Payment term ID. Example: "6a6b8337374668eea203cd45"')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string().describe('Created contract ID. Example: "6a71df4b92e09607f906dc08"')
});

const action = createAction({
    description: 'Create a new contract for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/1e60bdbba2c2ad2a6caf376732f4b18b.md
            endpoint: '/api/v2/pub/contracts',
            data: {
                name: input.name,
                project_id: input.project_id,
                status: input.status,
                initiation_date: input.initiation_date,
                effective_date: input.effective_date,
                contract_type: input.contract_type,
                vendor_contact_id: input.vendor_contact_id,
                client_contact_id: input.client_contact_id,
                wbs1: input.wbs1.map((item) => ({
                    name: item.name,
                    total_value: typeof item.total_value === 'number' ? String(item.total_value) : item.total_value,
                    cost_code_id: item.cost_code_id,
                    ...(item.site_id !== undefined && { site_id: item.site_id })
                })),
                ...(input.contract_holder !== undefined && { contract_holder: input.contract_holder }),
                ...(input.agreement_type !== undefined && { agreement_type: input.agreement_type }),
                ...(input.execution_note !== undefined && { execution_note: input.execution_note }),
                ...(input.custom_id !== undefined && { custom_id: input.custom_id }),
                ...(input.accounting_company_id !== undefined && { accounting_company_id: input.accounting_company_id }),
                ...(input.payment_term_id !== undefined && { payment_term_id: input.payment_term_id })
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate contract on a transient failure.
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
