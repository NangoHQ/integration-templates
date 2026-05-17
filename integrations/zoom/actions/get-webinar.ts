import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webinarId: z.number().describe('The webinar ID in long format. Example: 123456789')
});

const OccurrenceSchema = z.object({
    duration: z.number().optional(),
    occurrence_id: z.string().optional(),
    start_time: z.string().optional(),
    status: z.string().optional()
});

const RecurrenceSchema = z.object({
    end_date_time: z.string().optional(),
    end_times: z.number().optional(),
    monthly_day: z.number().optional(),
    monthly_week: z.number().optional(),
    monthly_week_day: z.number().optional(),
    repeat_interval: z.number().optional(),
    type: z.number().optional(),
    weekly_days: z.string().optional()
});

const TrackingFieldSchema = z.object({
    field: z.string().optional(),
    value: z.string().optional()
});

const ProviderWebinarSchema = z
    .object({
        uuid: z.string(),
        id: z.number(),
        host_id: z.string(),
        host_email: z.string().optional(),
        topic: z.string(),
        type: z.number(),
        start_time: z.string().optional(),
        duration: z.number().optional(),
        timezone: z.string().optional(),
        created_at: z.string().optional(),
        agenda: z.string().optional(),
        start_url: z.string().optional(),
        join_url: z.string().optional(),
        password: z.string().optional(),
        occurrences: z.array(OccurrenceSchema).optional(),
        recurrence: RecurrenceSchema.optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        tracking_fields: z.array(TrackingFieldSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderWebinarSchema;

const action = createAction({
    description: 'Retrieve a single webinar from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-webinar',
        group: 'Webinars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webinar:read:admin', 'webinar:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/webinars/getawebinar/
            endpoint: `/webinars/${input.webinarId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webinar not found',
                webinar_id: input.webinarId
            });
        }

        const webinar = ProviderWebinarSchema.parse(response.data);
        return webinar;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
