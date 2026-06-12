import { z } from 'zod';
import { createAction } from 'nango';

const AuthorSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    photoURL: z.string().nullable().optional(),
    type: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

const SourceSchema = z.object({
    extId: z.string().nullable().optional(),
    appName: z.string().nullable().optional(),
    appPhotoURL: z.string().nullable().optional(),
    permalink: z.string().nullable().optional(),
    type: z.string().optional()
});

const ThreadSchema = z
    .object({
        id: z.string(),
        channel: z.string().optional(),
        canReply: z.boolean().optional(),
        contentType: z.string().optional(),
        hasAttach: z.boolean().optional(),
        status: z.string().optional(),
        summary: z.string().optional(),
        author: AuthorSchema.optional(),
        attachmentCount: z.string().optional(),
        sentiment: z.string().nullable().optional(),
        aspects: z.string().nullable().optional(),
        channelRelatedInfo: z.unknown().nullable().optional(),
        respondedIn: z.unknown().nullable().optional(),
        lastRatingIconURL: z.string().nullable().optional(),
        readReceipts: z.unknown().nullable().optional(),
        impersonatedUser: z.unknown().nullable().optional(),
        source: SourceSchema.optional(),
        isDescriptionThread: z.boolean().optional(),
        keyWords: z.unknown().nullable().optional(),
        visibility: z.string().optional(),
        createdTime: z.string().optional(),
        actions: z.array(z.unknown()).optional(),
        direction: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    ticketId: z.string().describe('Ticket ID. Example: "1329983000000410241"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of threads to retrieve per page. Default: 50.')
});

const OutputSchema = z.object({
    threads: z.array(ThreadSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List ticket threads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-ticket-threads',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const extension = connection.connection_config?.['extension'];
        const baseUrl = extension && typeof extension === 'string' ? `https://desk.zoho.${extension}` : 'https://desk.zoho.com';
        const limit = input.limit ?? 50;
        const from = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(from) || from < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string.'
            });
        }

        const response = await nango.get({
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: `/api/v1/tickets/${encodeURIComponent(input.ticketId)}/threads`,
            params: {
                from: String(from),
                limit: String(limit)
            },
            retries: 3,
            baseUrlOverride: baseUrl
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho Desk API.'
            });
        }

        const threads = rawData.data.map((item: unknown) => {
            const parsed = ThreadSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse thread from Zoho Desk API.',
                    detail: parsed.error.message
                });
            }
            return parsed.data;
        });

        const nextCursor = threads.length === limit ? String(from + limit) : undefined;

        return {
            threads,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
