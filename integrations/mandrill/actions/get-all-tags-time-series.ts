import { z } from 'zod';
import { createAction } from 'nango';

const TagsTagTimeSeriesSchema = z.object({
    sent: z.number().int(),
    hard_bounces: z.number().int(),
    soft_bounces: z.number().int(),
    rejects: z.number().int(),
    complaints: z.number().int(),
    unsubs: z.number().int(),
    opens: z.number().int(),
    clicks: z.number().int(),
    unique_opens: z.number().int(),
    unique_clicks: z.number().int(),
    time: z.string().describe('The hour as a UTC date string in YYYY-MM-DD HH:MM:SS format. Example: "2025-08-29 15:00:00"')
});

const TagsTimeSeriesWithTagSchema = z
    .object({
        tag: z.string().describe('Tag name for this time series entry. Example: "test"')
    })
    .merge(TagsTagTimeSeriesSchema);

const InputSchema = z.object({});

const OutputSchema = z.array(TagsTimeSeriesWithTagSchema).describe('Array of hourly stats across all tags for the last 30 days');

const action = createAction({
    description: 'Get recent hourly stats aggregated across all tags',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/tags/
            endpoint: '1.4/tags/all-time-series',
            data: {},
            retries: 3
        });

        const parsed = z.array(TagsTimeSeriesWithTagSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response shape',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
