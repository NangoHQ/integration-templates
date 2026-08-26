import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID (bucket ID) containing the Campfire.'),
        chatId: z.number().describe('Campfire (chat) ID whose lines to list.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters for listing Campfire lines.');

const ProviderCreatorSchema = z
    .object({
        id: z.number(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderLineSchema = z
    .object({
        id: z.number(),
        content: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        creator: ProviderCreatorSchema.optional()
    })
    .passthrough();

const CreatorSchema = z
    .object({
        id: z.number().describe('Creator person ID.'),
        name: z.string().optional().describe('Creator name.')
    })
    .describe('Person who created a Campfire line.');

const LineSchema = z
    .object({
        id: z.number().describe('Line ID.'),
        content: z.string().optional().describe('Line content/message body.'),
        created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().optional().describe('ISO 8601 update timestamp.'),
        creator: CreatorSchema.optional().describe('Person who created this line.')
    })
    .describe('A single Campfire line/message.');

const OutputSchema = z
    .object({
        items: z.array(LineSchema).describe('Array of Campfire lines.'),
        next_cursor: z.string().optional().describe('URL to fetch the next page. Omit when there are no more pages.')
    })
    .describe('Output containing Campfire lines and an optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads Campfire messages from the Basecamp API.
 * @pitfalls: Campfire lines can include file uploads which have no `content` field; only text and rich-text lines include a message body.
 */
const action = createAction({
    description: 'List messages (lines) in a Campfire.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        let endpoint: string;
        let baseUrlOverride: string | undefined;
        let params: Record<string, string> | undefined;

        if (input.cursor) {
            const url = new URL(input.cursor);
            baseUrlOverride = url.origin;
            endpoint = url.pathname;
            const searchEntries = Array.from(url.searchParams.entries());
            if (searchEntries.length > 0) {
                params = Object.fromEntries(searchEntries);
            }
        } else {
            endpoint = `/buckets/${encodeURIComponent(String(input.projectId))}/chats/${encodeURIComponent(String(input.chatId))}/lines.json`;
        }

        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/campfires.md#get-campfire-lines
            endpoint,
            ...(baseUrlOverride && { baseUrlOverride }),
            ...(params && { params }),
            retries: 3
        };

        const response = await nango.get(config);

        const rawLines = z.array(ProviderLineSchema).parse(response.data);
        const items = rawLines.map((line) => ({
            id: line.id,
            ...(line.content !== undefined && { content: line.content }),
            ...(line.created_at !== undefined && { created_at: line.created_at }),
            ...(line.updated_at !== undefined && { updated_at: line.updated_at }),
            ...(line.creator && {
                creator: {
                    id: line.creator.id,
                    ...(line.creator.name !== undefined && { name: line.creator.name })
                }
            })
        }));

        const linkHeader = response.headers['link'];
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (match) {
                next_cursor = match[1];
            }
        }

        return {
            items,
            ...(next_cursor && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
