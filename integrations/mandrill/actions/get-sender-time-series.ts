import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    address: z.string().describe('The email address of the sender. Example: "sender@example.com"')
});

const HourStatSchema = z.object({
    time: z.string().optional().describe('UTC hour in YYYY-MM-DD HH:MM:SS format. Example: "2013-01-01 15:30:27"'),
    sent: z.number().optional(),
    hard_bounces: z.number().optional(),
    soft_bounces: z.number().optional(),
    rejects: z.number().optional(),
    complaints: z.number().optional(),
    opens: z.number().optional(),
    unique_opens: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional()
});

const OutputSchema = z.object({
    stats: z.array(HourStatSchema)
});

const action = createAction({
    description: 'Get recent hourly stats for a single sender address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/
            endpoint: '/1.0/senders/time-series.json',
            data: {
                address: input.address
            },
            retries: 3
        });

        const providerStats = z.array(z.unknown()).parse(response.data);

        const stats = providerStats.map((item: unknown) => {
            const parsed = HourStatSchema.parse(item);
            return {
                ...(parsed.time !== undefined && { time: parsed.time }),
                ...(parsed.sent !== undefined && { sent: parsed.sent }),
                ...(parsed.hard_bounces !== undefined && { hard_bounces: parsed.hard_bounces }),
                ...(parsed.soft_bounces !== undefined && { soft_bounces: parsed.soft_bounces }),
                ...(parsed.rejects !== undefined && { rejects: parsed.rejects }),
                ...(parsed.complaints !== undefined && { complaints: parsed.complaints }),
                ...(parsed.opens !== undefined && { opens: parsed.opens }),
                ...(parsed.unique_opens !== undefined && { unique_opens: parsed.unique_opens }),
                ...(parsed.clicks !== undefined && { clicks: parsed.clicks }),
                ...(parsed.unique_clicks !== undefined && { unique_clicks: parsed.unique_clicks })
            };
        });

        return {
            stats
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
