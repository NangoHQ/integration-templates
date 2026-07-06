import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead list ID. Example: "5c194eae-9382-4bf1-aff4-d9eaa90668e1"')
});

const ProviderStatsSchema = z.object({
    verified: z.number(),
    invalid: z.number(),
    risky: z.number(),
    catch_all: z.number(),
    job_change: z.number(),
    verification_job_pending_leadfinder: z.number(),
    verification_job_pending_user: z.number()
});

const ProviderResponseSchema = z.object({
    stats: ProviderStatsSchema,
    total_leads: z.number()
});

const OutputSchema = z.object({
    stats: z.object({
        verified: z.number(),
        invalid: z.number(),
        risky: z.number(),
        catch_all: z.number(),
        job_change: z.number(),
        verification_job_pending_leadfinder: z.number(),
        verification_job_pending_user: z.number()
    }),
    total_leads: z.number()
});

const action = createAction({
    description: 'Get verification statistics for a lead list',
    version: '1.0.0',
    endpoint: { path: '/actions/get-lead-list-verification-stats', method: 'GET' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lead_lists:read', 'lead_lists:all', 'all:read', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/leadlist/get-verification-statistics-for-a-lead-list
        const response = await nango.get({
            endpoint: `/v2/lead-lists/${encodeURIComponent(input.id)}/verification-stats`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            stats: {
                verified: providerResponse.stats.verified,
                invalid: providerResponse.stats.invalid,
                risky: providerResponse.stats.risky,
                catch_all: providerResponse.stats.catch_all,
                job_change: providerResponse.stats.job_change,
                verification_job_pending_leadfinder: providerResponse.stats.verification_job_pending_leadfinder,
                verification_job_pending_user: providerResponse.stats.verification_job_pending_user
            },
            total_leads: providerResponse.total_leads
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
