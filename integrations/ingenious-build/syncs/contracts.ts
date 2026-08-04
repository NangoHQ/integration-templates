import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContractWbs3Schema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    total_value: z.string().optional(),
    cost_code_id: z.string().optional()
});

const ContractWbs2Schema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    total_value: z.string().optional(),
    cost_code_id: z.string().optional(),
    wbs3: z.array(ContractWbs3Schema).optional()
});

const ContractWbs1Schema = z.object({
    id: z.string(),
    name: z.string().optional(),
    total_value: z.string().optional(),
    cost_code_id: z.string().optional(),
    site_id: z.string().nullable().optional(),
    contract_change_id: z.string().nullable().optional(),
    wbs2: z.array(ContractWbs2Schema).optional()
});

const ContractSchema = z.object({
    id: z.string(),
    generated_id: z.string().optional(),
    custom_id: z.string().nullable().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    project_id: z.string().optional(),
    contract_holder: z.string().optional(),
    total_value: z.string().optional(),
    vendor_company_id: z.string().optional(),
    vendor_contact_id: z.string().optional(),
    client_company_id: z.string().optional(),
    client_contact_id: z.string().optional(),
    status: z.string().optional(),
    sov_status: z.string().optional(),
    retention: z.number().optional(),
    effective_date: z.string().nullable().optional(),
    initiation_date: z.string().nullable().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    wbs1: z.array(ContractWbs1Schema).nullable().optional(),
    accounting_company_id: z.string().nullable().optional(),
    payment_term_id: z.string().nullable().optional()
});

const PaginatedListSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    next_page_url: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync contracts across projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contract: ContractSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Full refresh: provider V2 list endpoint has no viable incremental filter confirmed live.
        // Resume the current full scan by checkpointing the next page.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Contract');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/a7f30cc208e5c50b2929494bcdf0d715.md
            endpoint: '/api/v2/pub/contracts',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = PaginatedListSchema.parse({ items: page }).items;

            const contracts = rawItems.map((item) => {
                const parsed = ContractSchema.parse(item);
                return {
                    id: parsed.id,
                    generated_id: parsed.generated_id,
                    custom_id: parsed.custom_id,
                    name: parsed.name,
                    description: parsed.description,
                    project_id: parsed.project_id,
                    contract_holder: parsed.contract_holder,
                    total_value: parsed.total_value,
                    vendor_company_id: parsed.vendor_company_id,
                    vendor_contact_id: parsed.vendor_contact_id,
                    client_company_id: parsed.client_company_id,
                    client_contact_id: parsed.client_contact_id,
                    status: parsed.status,
                    sov_status: parsed.sov_status,
                    retention: parsed.retention,
                    effective_date: parsed.effective_date,
                    initiation_date: parsed.initiation_date,
                    source: parsed.source,
                    type: parsed.type,
                    created_at: parsed.created_at,
                    updated_at: parsed.updated_at,
                    wbs1: parsed.wbs1,
                    accounting_company_id: parsed.accounting_company_id,
                    payment_term_id: parsed.payment_term_id
                };
            });

            if (contracts.length > 0) {
                await nango.batchSave(contracts, 'Contract');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contract');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
