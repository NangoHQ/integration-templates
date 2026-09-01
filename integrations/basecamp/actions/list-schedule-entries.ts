import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID containing the schedule.'),
        scheduleId: z.number().describe('Schedule ID to list entries from.'),
        status: z.enum(['archived', 'trashed']).optional().describe('Filter by status: archived or trashed. Omit for active entries.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing schedule entries on a project schedule.');

const ScheduleEntrySchema = z
    .object({
        id: z.number().describe('Unique ID of the schedule entry.'),
        status: z.string().describe('Current status: active, archived, or trashed.'),
        visible_to_clients: z.boolean().optional().describe('Whether the entry is visible to clients.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format.'),
        title: z.string().describe('Title of the schedule entry.'),
        inherits_status: z.boolean().optional().describe('Whether the entry inherits status from its parent.'),
        type: z.string().describe('Type of the record (e.g., Schedule::Entry).'),
        url: z.string().describe('API URL for this schedule entry.'),
        app_url: z.string().describe('Web app URL for this schedule entry.'),
        summary: z.string().describe('Short summary of the schedule entry.'),
        description: z.string().optional().describe('Detailed description in HTML format.'),
        all_day: z.boolean().describe('Whether the entry spans the full day.'),
        highlighted: z.boolean().describe('Whether the entry is highlighted on the schedule.'),
        starts_at: z.string().describe('Start date/time in ISO 8601 format.'),
        ends_at: z.string().describe('End date/time in ISO 8601 format.'),
        join_url: z.string().nullable().optional().describe('Join URL for the entry, such as a video-call link.'),
        participants: z.array(z.object({}).passthrough()).optional().describe('People participating in the schedule entry.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(ScheduleEntrySchema).describe('Schedule entries on the current page.'),
        next_cursor: z.string().optional().describe('Cursor for the next page, if more entries exist.')
    })
    .describe('Paginated list of schedule entries on a project schedule.');

/**
 * @tags: [read]
 * @tagReason: Reads schedule entries from the Basecamp API.
 */
const action = createAction({
    description: "List entries (events) on a project's schedule.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/schedule_entries.md#get-schedule-entries
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedules/${encodeURIComponent(input.scheduleId)}/entries.json`,
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const items = z.array(z.unknown()).parse(response.data);
        const nextCursor = parseNextCursor(response.headers);

        return {
            items: items.map((item: unknown) => ScheduleEntrySchema.parse(item)),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

function parseNextCursor(headers: unknown): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }

    const linkHeader = Reflect.get(headers, 'link');
    if (typeof linkHeader !== 'string') {
        return undefined;
    }

    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    if (match && match[1]) {
        return match[1];
    }

    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
