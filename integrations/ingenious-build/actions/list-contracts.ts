import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items per page. Maximum 100.'),
    project_id: z.string().optional().describe('Filter contracts by project ID.'),
    custom_id: z.string().optional().describe('Filter contracts by custom ID.'),
    include_wbs: z.boolean().optional().describe('When true, includes WBS structure in each contract.')
});

const ProviderWbs3Schema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    total_value: z.string(),
    cost_code_id: z.string()
});

const ProviderWbs2Schema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    total_value: z.string(),
    cost_code_id: z.string(),
    wbs3: z.array(ProviderWbs3Schema).optional()
});

const ProviderWbs1Schema = z.object({
    id: z.string(),
    name: z.string(),
    total_value: z.string(),
    cost_code_id: z.string(),
    site_id: z.string().nullable().optional(),
    contract_change_id: z.string().nullable().optional(),
    wbs2: z.array(ProviderWbs2Schema).optional()
});

const ProviderContractItemSchema = z.object({
    id: z.string(),
    generated_id: z.string(),
    custom_id: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    project_id: z.string(),
    contract_holder: z.string(),
    total_value: z.string(),
    vendor_company_id: z.string(),
    vendor_contact_id: z.string(),
    client_company_id: z.string(),
    client_contact_id: z.string(),
    status: z.string(),
    sov_status: z.string(),
    retention: z.number().nullable().optional(),
    effective_date: z.string().nullable().optional(),
    initiation_date: z.string().nullable().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    wbs1: z.array(ProviderWbs1Schema).nullable().optional(),
    accounting_company_id: z.string().nullable().optional(),
    payment_term_id: z.string().nullable().optional()
});

const ContractItemSchema = z.object({
    id: z.string(),
    generated_id: z.string(),
    custom_id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    contract_holder: z.string(),
    total_value: z.string(),
    vendor_company_id: z.string(),
    vendor_contact_id: z.string(),
    client_company_id: z.string(),
    client_contact_id: z.string(),
    status: z.string(),
    sov_status: z.string(),
    retention: z.number().optional(),
    effective_date: z.string().optional(),
    initiation_date: z.string().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    wbs1: z.array(ProviderWbs1Schema).optional(),
    accounting_company_id: z.string().optional(),
    payment_term_id: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(ContractItemSchema),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderContractItemSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const action = createAction({
    description: 'List contracts',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer'
            });
        }

        const params: Record<string, string> = {
            page: String(page),
            per_page: String(input.per_page ?? 20)
        };

        if (input.project_id !== undefined) {
            params['project_id'] = input.project_id;
        }
        if (input.custom_id !== undefined) {
            params['custom_id'] = input.custom_id;
        }
        if (input.include_wbs === true) {
            params['include_wbs'] = 'true';
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/a7f30cc208e5c50b2929494bcdf0d715
            endpoint: '/api/v2/pub/contracts',
            params,
            retries: 3
        });

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider'
            });
        }

        const parsed = ProviderListResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response does not match expected schema',
                details: parsed.error.message
            });
        }

        const data = parsed.data;

        const items = data.items.map((item) => ({
            id: item.id,
            generated_id: item.generated_id,
            ...(item.custom_id != null && { custom_id: item.custom_id }),
            name: item.name,
            ...(item.description != null && { description: item.description }),
            project_id: item.project_id,
            contract_holder: item.contract_holder,
            total_value: item.total_value,
            vendor_company_id: item.vendor_company_id,
            vendor_contact_id: item.vendor_contact_id,
            client_company_id: item.client_company_id,
            client_contact_id: item.client_contact_id,
            status: item.status,
            sov_status: item.sov_status,
            ...(item.retention !== undefined && item.retention !== null && { retention: item.retention }),
            ...(item.effective_date != null && { effective_date: item.effective_date }),
            ...(item.initiation_date != null && { initiation_date: item.initiation_date }),
            ...(item.source !== undefined && { source: item.source }),
            ...(item.type !== undefined && { type: item.type }),
            created_at: item.created_at,
            updated_at: item.updated_at,
            ...(item.wbs1 !== undefined && item.wbs1 !== null && { wbs1: item.wbs1 }),
            ...(item.accounting_company_id != null && { accounting_company_id: item.accounting_company_id }),
            ...(item.payment_term_id != null && { payment_term_id: item.payment_term_id })
        }));

        const hasMore = data.page * data.per_page < data.total;
        const next_cursor = hasMore ? String(data.page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
