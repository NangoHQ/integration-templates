import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const StatsPeriodSchema = z
    .object({
        sent: z.number().optional(),
        hard_bounces: z.number().optional(),
        soft_bounces: z.number().optional(),
        rejects: z.number().optional(),
        complaints: z.number().optional(),
        unsubs: z.number().optional(),
        opens: z.number().optional(),
        unique_opens: z.number().optional(),
        clicks: z.number().optional(),
        unique_clicks: z.number().optional()
    })
    .passthrough();

const ProviderStatsSchema = z
    .object({
        today: StatsPeriodSchema.optional(),
        last_7_days: StatsPeriodSchema.optional(),
        last_30_days: StatsPeriodSchema.optional(),
        last_60_days: StatsPeriodSchema.optional(),
        last_90_days: StatsPeriodSchema.optional(),
        all_time: StatsPeriodSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        username: z.string(),
        created_at: z.string().optional(),
        public_id: z.string().optional(),
        reputation: z.number(),
        hourly_quota: z.number(),
        backlog: z.number().optional(),
        stats: ProviderStatsSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    username: z.string(),
    created_at: z.string().optional(),
    public_id: z.string().optional(),
    reputation: z.number(),
    hourly_quota: z.number(),
    backlog: z.number().optional(),
    stats: ProviderStatsSchema.optional()
});

const action = createAction({
    description: 'Return information about the API-connected Mandrill account/user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/users/get-user-info/
            endpoint: 'users/info.json',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {},
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            username: providerData.username,
            ...(providerData.created_at !== undefined && { created_at: providerData.created_at }),
            ...(providerData.public_id !== undefined && { public_id: providerData.public_id }),
            reputation: providerData.reputation,
            hourly_quota: providerData.hourly_quota,
            ...(providerData.backlog !== undefined && { backlog: providerData.backlog }),
            ...(providerData.stats !== undefined && { stats: providerData.stats })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
