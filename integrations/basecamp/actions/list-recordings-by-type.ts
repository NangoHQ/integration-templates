import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        type: z
            .enum([
                'Todo',
                'Message',
                'Document',
                'Upload',
                'Kanban::Card',
                'Kanban::Step',
                'Question::Answer',
                'Schedule::Entry',
                'Todolist',
                'Door',
                'Vault',
                'Comment'
            ])
            .describe('The recording type to list. Required.'),
        bucket: z.string().optional().describe('Single or comma-separated project IDs to filter by. Default: all active projects visible to the current user.'),
        status: z.enum(['active', 'archived', 'trashed']).optional().describe('Filter by recording status. Default: active.'),
        sort: z.enum(['created_at', 'updated_at']).optional().describe('Sort field. Default: created_at.'),
        direction: z.enum(['desc', 'asc']).optional().describe('Sort direction. Default: desc.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters for listing recordings by type across one or more projects.');

const RecordingSchema = z
    .object({
        id: z.number().describe('Unique identifier for the recording.'),
        status: z.string().describe('The recording status: active, archived, or trashed.'),
        type: z.string().describe('The recording type, e.g. Todo, Message, Comment, etc.'),
        created_at: z.string().describe('ISO 8601 timestamp when the recording was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the recording was last updated.'),
        title: z.string().describe('The recording title.'),
        url: z.string().describe('API URL for the recording.'),
        app_url: z.string().describe('Basecamp web application URL for the recording.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        recordings: z.array(RecordingSchema).describe('Recordings matching the requested type and filters, one page at a time.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output containing a page of recordings matching the requested type and filters.');

/**
 * @tags: [read]
 * @tagReason: Reads recordings from the Basecamp API via a GET request.
 * @pitfalls: Each recording type returns a different object shape; for example, Todo includes assignees and due dates while Upload includes filenames and download URLs. Returns one page at a time; pass the returned `next_cursor` to fetch more.
 */
const action = createAction({
    description: 'List all recordings of a given type across one or more projects, account-wide.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            type: input.type
        };

        if (input.bucket !== undefined) {
            params['bucket'] = input.bucket;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.direction !== undefined) {
            params['direction'] = input.direction;
        }
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/recordings.md#get-recordings
        const response = await nango.get({
            endpoint: '/projects/recordings.json',
            params,
            retries: 3
        });

        const recordings = z.array(RecordingSchema).parse(response.data);

        const linkHeader = response.headers?.['link'];
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const pageMatch = nextMatch[1].match(/[?&]page=([^&]+)/);
                if (pageMatch && pageMatch[1]) {
                    next_cursor = pageMatch[1];
                }
            }
        }

        return {
            recordings,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
