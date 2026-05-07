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
        // /companies has cursor pagination but no provider-side updated_at
        // filter, so this stays a full refresh for correct delete tracking.
        await nango.trackDeletesStart('Company');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/listCompanies
            endpoint: '/companies',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'data',
                limit_name_in_request: 'per_page',
                limit: 60
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        };

        for await (const companyBatch of nango.paginate<{
            id: string;
            name?: string | null;
            company_id?: string | null;
            created_at?: number;
            updated_at?: number;
            session_count?: number;
            monthly_spend?: number;
            user_count?: number;
            plan?: string | null;
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
                ...(typeof record.plan === 'string' && { plan: record.plan }),
                ...(record.size != null && { size: record.size }),
                ...(record.website != null && { website: record.website }),
                ...(record.industry != null && { industry: record.industry })
            }));

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }
        }

        await nango.trackDeletesEnd('Company');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
