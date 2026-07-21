import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag: z.string().describe('An existing tag name. Example: "example-tag"')
});

const TimeSeriesEntrySchema = z.object({
    sent: z.number().int(),
    hard_bounces: z.number().int(),
    soft_bounces: z.number().int(),
    rejects: z.number().int(),
    complaints: z.number().int(),
    unsubs: z.number().int(),
    opens: z.number().int(),
    unique_opens: z.number().int(),
    clicks: z.number().int(),
    unique_clicks: z.number().int(),
    time: z.string().describe('The hour as a UTC date string in YYYY-MM-DD HH:MM:SS format. Example: "2025-08-29 15:00:00"')
});

const OutputSchema = z.object({
    tag: z.string(),
    stats: z.array(TimeSeriesEntrySchema)
});

const action = createAction({
    description: 'Get recent hourly stats for a single tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/tags/tags-time-series/
            endpoint: '1.0/tags/time-series',
            data: {
                tag: input.tag
            },
            retries: 3
        });

        const parsed = z.array(TimeSeriesEntrySchema).parse(response.data);

        return {
            tag: input.tag,
            stats: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
