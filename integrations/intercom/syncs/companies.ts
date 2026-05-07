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

const sync = createSync({
    description: 'Sync company records from Intercom.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/companies' }],
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        // Uses the scroll API to avoid the 10k record cap of the paged /companies endpoint.
        await nango.trackDeletesStart('Company');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/scrollOverAllCompanies
            endpoint: '/companies/scroll',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'scroll_param',
                cursor_name_in_request: 'scroll_param',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'per_page'
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        };

        try {
            for await (const companyBatch of nango.paginate<{
                id: string;
                name?: string | null;
                company_id?: string | null;
                created_at?: number;
                updated_at?: number;
                session_count?: number;
                monthly_spend?: number;
                user_count?: number;
                plan?: string | { type?: string; name?: string } | null;
                size?: number | null;
                website?: string | null;
                industry?: string | null;
            }>(proxyConfig)) {
                const companies = companyBatch.map((record) => ({
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
            }
        } finally {
            await nango.trackDeletesEnd('Company');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
