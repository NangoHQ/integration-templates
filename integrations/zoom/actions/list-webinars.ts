import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('The user ID or email address of the user. For user-level apps, pass `me`.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(300).optional().describe('The number of records returned within a single API call.')
});

const WebinarSchema = z.object({
    id: z.number().int(),
    uuid: z.string(),
    host_id: z.string(),
    topic: z.string(),
    type: z.number().int().optional(),
    start_time: z.string().optional(),
    duration: z.number().int().optional(),
    timezone: z.string().optional(),
    created_at: z.string().optional(),
    agenda: z.string().optional(),
    join_url: z.string().optional()
});

const OutputSchema = z.object({
    webinars: z.array(WebinarSchema),
    next_page_token: z.string().optional(),
    page_size: z.number().int().optional(),
    total_records: z.number().int().optional()
});

const action = createAction({
    description: 'List webinars from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webinars',
        group: 'Webinars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webinar:read:admin', 'webinar:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/webinars
        const response = await nango.get({
            endpoint: `/users/${input.userId || 'me'}/webinars`,
            params: {
                ...(input.cursor !== undefined && { next_page_token: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoom API'
            });
        }

        const parsed = z
            .object({
                webinars: z.array(z.unknown()).default([]),
                next_page_token: z.string().optional(),
                page_size: z.number().int().optional(),
                total_records: z.number().int().optional()
            })
            .parse(raw);

        const webinars = parsed.webinars.map((item) => {
            const webinar = WebinarSchema.parse(item);
            return {
                id: webinar.id,
                uuid: webinar.uuid,
                host_id: webinar.host_id,
                topic: webinar.topic,
                ...(webinar.type !== undefined && { type: webinar.type }),
                ...(webinar.start_time !== undefined && { start_time: webinar.start_time }),
                ...(webinar.duration !== undefined && { duration: webinar.duration }),
                ...(webinar.timezone !== undefined && { timezone: webinar.timezone }),
                ...(webinar.created_at !== undefined && { created_at: webinar.created_at }),
                ...(webinar.agenda !== undefined && { agenda: webinar.agenda }),
                ...(webinar.join_url !== undefined && { join_url: webinar.join_url })
            };
        });

        return {
            webinars,
            ...(parsed.next_page_token !== undefined && { next_page_token: parsed.next_page_token }),
            ...(parsed.page_size !== undefined && { page_size: parsed.page_size }),
            ...(parsed.total_records !== undefined && { total_records: parsed.total_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
