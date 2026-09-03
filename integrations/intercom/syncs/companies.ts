import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    company_id: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    session_count: z.number().optional(),
    monthly_spend: z.number().optional(),
    user_count: z.number().optional(),
    plan: z.string().optional().nullable(),
    size: z.number().optional(),
    website: z.string().optional(),
    industry: z.string().optional()
});

const CheckpointSchema = z.object({
    scroll_param: z.string()
});

const ProviderCompanySchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    session_count: z.number().optional(),
    monthly_spend: z.number().optional(),
    user_count: z.number().optional(),
    plan: z.union([z.string(), z.object({ name: z.string().optional() }), z.null()]).optional(),
    size: z.number().nullable().optional(),
    website: z.string().nullable().optional(),
    industry: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    type: z.string().optional(),
    data: z.array(ProviderCompanySchema),
    pages: z.unknown().nullable().optional(),
    total_count: z.unknown().nullable().optional(),
    scroll_param: z.string().optional()
});

const sync = createSync({
    description: 'Sync company records from Intercom.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/companies' }],
    models: {
        Company: CompanySchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        // Uses the scroll API to avoid the 10k record cap of the paged /companies endpoint.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? null : CheckpointSchema.parse(rawCheckpoint);
        let scrollParam = checkpoint?.scroll_param;

        await nango.trackDeletesStart('Company');

        while (true) {
            const proxyConfig: ProxyConfiguration = {
                // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/scrollOverAllCompanies
                endpoint: '/companies/scroll',
                params: {
                    per_page: '100',
                    ...(scrollParam && { scroll_param: scrollParam })
                },
                headers: {
                    'Intercom-Version': '2.11'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsed = ProviderResponseSchema.parse(response.data);

            const companies = parsed.data.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                ...(record.company_id != null && { company_id: record.company_id }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at }),
                ...(record.session_count != null && { session_count: record.session_count }),
                ...(record.monthly_spend != null && { monthly_spend: record.monthly_spend }),
                ...(record.user_count != null && { user_count: record.user_count }),
                ...(record.plan != null && {
                    plan: typeof record.plan === 'string' ? record.plan : record.plan.name
                }),
                ...(record.size != null && { size: record.size }),
                ...(record.website != null && { website: record.website }),
                ...(record.industry != null && { industry: record.industry })
            }));

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }

            if (parsed.data.length === 0) {
                break;
            }

            if (!parsed.scroll_param) {
                break;
            }

            scrollParam = parsed.scroll_param;
            await nango.saveCheckpoint({ scroll_param: scrollParam });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Company');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
