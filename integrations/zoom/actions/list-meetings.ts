import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID or email address of the user. For user-level apps, pass `me` as the value for userId.'),
    type: z.enum(['scheduled', 'live', 'upcoming']).optional().describe('The meeting types to query.'),
    page_size: z.number().int().min(1).max(300).optional().describe('The number of records returned within a single API call. Max 300.'),
    cursor: z.string().optional().describe('Pagination cursor (next_page_token) from the previous response. Omit for the first page.')
});

const ProviderMeetingSchema = z.object({
    agenda: z.string().optional(),
    created_at: z.string().optional(),
    duration: z.number().optional(),
    host_id: z.string().optional(),
    id: z.number().optional(),
    join_url: z.string().optional(),
    pmi: z.string().optional(),
    start_time: z.string().optional(),
    timezone: z.string().optional(),
    topic: z.string().optional(),
    type: z.number().optional(),
    uuid: z.string().optional()
});

const OutputSchema = z.object({
    meetings: z.array(
        z.object({
            agenda: z.string().optional(),
            created_at: z.string().optional(),
            duration: z.number().optional(),
            host_id: z.string().optional(),
            id: z.number().optional(),
            join_url: z.string().optional(),
            pmi: z.string().optional(),
            start_time: z.string().optional(),
            timezone: z.string().optional(),
            topic: z.string().optional(),
            type: z.number().optional(),
            uuid: z.string().optional()
        })
    ),
    next_page_token: z.string().optional(),
    page_count: z.number().optional(),
    page_number: z.number().optional(),
    page_size: z.number().optional(),
    total_records: z.number().optional()
});

const action = createAction({
    description: 'List meetings from Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:read:admin', 'meeting:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/meetings/#tag/meetings/get/users/{userId}/meetings
        const response = await nango.get({
            endpoint: `/users/${input.userId}/meetings`,
            params: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.cursor !== undefined && { next_page_token: input.cursor })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            meetings: z.array(ProviderMeetingSchema).optional(),
            next_page_token: z.string().optional(),
            page_count: z.number().optional(),
            page_number: z.number().optional(),
            page_size: z.number().optional(),
            total_records: z.number().optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            meetings:
                parsed.meetings?.map((meeting) => ({
                    ...(meeting.agenda !== undefined && { agenda: meeting.agenda }),
                    ...(meeting.created_at !== undefined && { created_at: meeting.created_at }),
                    ...(meeting.duration !== undefined && { duration: meeting.duration }),
                    ...(meeting.host_id !== undefined && { host_id: meeting.host_id }),
                    ...(meeting.id !== undefined && { id: meeting.id }),
                    ...(meeting.join_url !== undefined && { join_url: meeting.join_url }),
                    ...(meeting.pmi !== undefined && { pmi: meeting.pmi }),
                    ...(meeting.start_time !== undefined && { start_time: meeting.start_time }),
                    ...(meeting.timezone !== undefined && { timezone: meeting.timezone }),
                    ...(meeting.topic !== undefined && { topic: meeting.topic }),
                    ...(meeting.type !== undefined && { type: meeting.type }),
                    ...(meeting.uuid !== undefined && { uuid: meeting.uuid })
                })) ?? [],
            ...(parsed.next_page_token !== undefined && { next_page_token: parsed.next_page_token }),
            ...(parsed.page_count !== undefined && { page_count: parsed.page_count }),
            ...(parsed.page_number !== undefined && { page_number: parsed.page_number }),
            ...(parsed.page_size !== undefined && { page_size: parsed.page_size }),
            ...(parsed.total_records !== undefined && { total_records: parsed.total_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
