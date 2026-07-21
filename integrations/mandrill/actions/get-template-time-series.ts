import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The immutable name of an existing template. Example: "Welcome Email"')
});

const TimeSeriesEntrySchema = z.object({
    time: z.string().describe('The start of the hour slot. Example: "2026-01-15T10:00:00Z"'),
    sent: z.number(),
    hard_bounces: z.number(),
    soft_bounces: z.number(),
    rejects: z.number(),
    complaints: z.number(),
    unsubs: z.number(),
    opens: z.number(),
    unique_opens: z.number(),
    clicks: z.number(),
    unique_clicks: z.number()
});

const OutputSchema = z.object({
    time_series: z.array(TimeSeriesEntrySchema)
});

const action = createAction({
    description: 'Get recent hourly stats for a single template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/templates/time-series/
            endpoint: 'templates/time-series',
            data: {
                name: input.name
            },
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            retries: 3
        });

        const parsed = z.array(TimeSeriesEntrySchema).parse(response.data);

        return {
            time_series: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
