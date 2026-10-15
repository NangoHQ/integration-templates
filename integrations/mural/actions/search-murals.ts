import { z } from 'zod';
import { createAction } from 'nango';

const ProviderMuralSummarySchema = z.object({
    id: z.string(),
    title: z.string(),
    roomId: z.number(),
    status: z.enum(['active', 'archived']),
    workspaceId: z.string(),
    workspaceName: z.string(),
    createdOn: z.number(),
    updatedBy: z.string(),
    viewLink: z.string(),
    createdBy: z.string().optional(),
    updatedOn: z.number().optional(),
    thumbnailUrl: z.string().optional()
});

const ProviderSearchResponseSchema = z.object({
    value: z.array(ProviderMuralSummarySchema),
    next: z.string().optional()
});

const MuralSummarySchema = z.object({
    id: z.string().describe('Unique ID of the mural. Example: "nangodev4776.1791996331715".'),
    title: z.string().describe('Title of the mural; blank titles are returned as an empty string.'),
    roomId: z.number().describe('ID of the room containing the mural.'),
    status: z.enum(['active', 'archived']).describe('Whether the mural is active or archived.'),
    workspaceId: z.string().describe('ID of the workspace containing the mural.'),
    workspaceName: z.string().describe('Name of the workspace containing the mural.'),
    createdOn: z.number().describe('Creation time as a Unix epoch timestamp in milliseconds.'),
    updatedBy: z.string().describe('ID of the user who last edited the mural.'),
    viewLink: z.string().describe('URL that opens the mural in MURAL.'),
    createdBy: z.string().optional().describe('ID of the user who created the mural.'),
    updatedOn: z.number().optional().describe('Last modification time as a Unix epoch timestamp in milliseconds.'),
    thumbnailUrl: z.string().optional().describe('URL of the mural thumbnail image.')
});

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace to search. Example: "workspace1234".'),
        query: z.string().min(1).describe('Full-text search text matched against mural titles.'),
        roomId: z.number().int().optional().describe('Restrict results to murals inside this room ID.'),
        limit: z.number().int().min(1).max(99).optional().describe('Maximum number of murals to return per page (1-99).'),
        cursor: z.string().optional().describe('Pagination cursor returned by a previous call; omit to fetch the first page.')
    })
    .describe('Input for searching murals in a workspace by title, optionally scoped to a room.');

const OutputSchema = z
    .object({
        murals: z.array(MuralSummarySchema).describe('Murals matching the search query.'),
        nextCursor: z.string().optional().describe('Cursor to fetch the next page of results, present only when more results exist.')
    })
    .describe('Search results containing the matching murals and an optional cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Searches murals and returns matching records without modifying any provider state.
 * @pitfalls: Only returns murals the authenticated user owns or is a member of, and the next cursor expires, so a stored cursor can fail with NEXT_TOKEN_EXPIRED.
 */
const action = createAction({
    description: 'Search murals in a workspace by title, optionally scoped to a room.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/searchmurals
            endpoint: `/api/public/v1/search/${encodeURIComponent(input.workspaceId)}/murals`,
            params: {
                q: input.query,
                ...(input.roomId !== undefined && { roomId: input.roomId }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderSearchResponseSchema.parse(response.data);

        return {
            murals: parsed.value.map((mural) => ({
                id: mural.id,
                title: mural.title,
                roomId: mural.roomId,
                status: mural.status,
                workspaceId: mural.workspaceId,
                workspaceName: mural.workspaceName,
                createdOn: mural.createdOn,
                updatedBy: mural.updatedBy,
                viewLink: mural.viewLink,
                ...(mural.createdBy !== undefined && { createdBy: mural.createdBy }),
                ...(mural.updatedOn !== undefined && { updatedOn: mural.updatedOn }),
                ...(mural.thumbnailUrl !== undefined && { thumbnailUrl: mural.thumbnailUrl })
            })),
            ...(parsed.next !== undefined && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
