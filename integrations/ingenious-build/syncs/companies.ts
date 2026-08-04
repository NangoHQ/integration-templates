import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCompanySchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    account_type: z.string().nullable(),
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zip: z.string().nullable(),
    country_code: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    website: z.string().nullable(),
    custom_id: z.string().nullable(),
    office_locations: z.array(z.string()).optional(),
    is_archived: z.boolean().nullable(),
    tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_type: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country_code: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    custom_id: z.string().optional(),
    office_locations: z.array(z.string()).optional(),
    is_archived: z.boolean().optional(),
    tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: "Sync companies (this API's equivalent of vendors/subcontractors/clients) in this workspace.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: provider only exposes page/per_page pagination with no verified
        // modified-since query parameter for incremental filtering. Resume the
        // current full scan by checkpointing the next page instead.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Company');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/indexcompanypubv2
            endpoint: '/api/v2/pub/companies',
            params: {
                show_archived: 'true'
            },
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
            const parsedPage = z.array(ProviderCompanySchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse companies page: ${parsedPage.error.message}`);
            }

            const companies = parsedPage.data.map((record) => {
                return {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.account_type != null && { account_type: record.account_type }),
                    ...(record.address1 != null && { address1: record.address1 }),
                    ...(record.address2 != null && { address2: record.address2 }),
                    ...(record.city != null && { city: record.city }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.zip != null && { zip: record.zip }),
                    ...(record.country_code != null && { country_code: record.country_code }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.website != null && { website: record.website }),
                    ...(record.custom_id != null && { custom_id: record.custom_id }),
                    ...(record.office_locations != null && { office_locations: record.office_locations }),
                    ...(record.is_archived != null && { is_archived: record.is_archived }),
                    ...(record.tags != null && { tags: record.tags }),
                    created_at: record.created_at,
                    updated_at: record.updated_at
                };
            });

            if (companies.length === 0) {
                continue;
            }

            await nango.batchSave(companies, 'Company');

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Company');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
