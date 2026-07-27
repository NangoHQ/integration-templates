import { z } from 'zod';
import { createAction } from 'nango';

const StatsWindowSchema = z.object({
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
});

const SenderSchema = z.object({
    address: z.string().optional(),
    created_at: z.string().optional(),
    sent: z.number().optional(),
    hard_bounces: z.number().optional(),
    soft_bounces: z.number().optional(),
    rejects: z.number().optional(),
    complaints: z.number().optional(),
    unsubs: z.number().optional(),
    opens: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional(),
    unique_opens: z.number().optional(),
    reputation: z.number().optional()
});

const OutputSchema = SenderSchema.merge(
    z.object({
        stats: z
            .object({
                today: StatsWindowSchema.optional(),
                last_7_days: StatsWindowSchema.optional(),
                last_30_days: StatsWindowSchema.optional(),
                last_60_days: StatsWindowSchema.optional(),
                last_90_days: StatsWindowSchema.optional()
            })
            .optional()
    })
);

const InputSchema = z.object({
    address: z.string().describe('The email address of the sender. Example: "sender@example.com"')
});

const action = createAction({
    description: 'Get detailed sending information about a single sender address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/
            endpoint: '/1.0/senders/info.json',
            data: {
                address: input.address
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
