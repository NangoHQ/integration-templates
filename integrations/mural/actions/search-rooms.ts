import { z } from 'zod';
import { createAction } from 'nango';

const RoomSummarySchema = z.object({
    id: z.number().describe('Unique numeric ID of the room. Example: 1791984264781658'),
    name: z.string().describe('Name of the room. Example: "Design room"'),
    description: z.string().describe('Description of the room; an empty string when the room has none.'),
    type: z.enum(['open', 'private']).describe('Whether any workspace member can join the room ("open") or only invited members can ("private").'),
    workspaceId: z.string().describe('ID of the workspace the room belongs to. Example: "nangodev4776"')
});

const InputSchema = z
    .object({
        workspaceId: z.string().min(1).describe('Unique identifier of the workspace to search rooms in. Example: "nangodev4776"'),
        q: z.string().min(1).describe('Text to search for in room names. Required; the provider rejects an empty query. Example: "Design"'),
        limit: z.number().int().min(1).max(25).optional().describe('Maximum number of rooms to return (1-25). Omit to use the provider default.'),
        next: z.string().min(1).optional().describe('Pagination token returned as "next" by a previous call. Reuse the same limit that produced it.')
    })
    .describe('Parameters for searching rooms in a Mural workspace by name.');

const OutputSchema = z
    .object({
        rooms: z.array(RoomSummarySchema).describe('Rooms matching the search query.'),
        next: z.string().optional().describe('Token to fetch the next page of results; omit the input "next" to fetch the first page.')
    })
    .describe('Rooms matching the search query, with an optional token for the next page of results.');

const ProviderResponseSchema = z.object({
    value: z.array(RoomSummarySchema),
    next: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Searches and reads room records from the provider; it performs no provider mutations.
 * @pitfalls: Only rooms the authenticated user owns or is a member of are returned; matching is fuzzy/substring-based and eventually consistent, so it can return non-exact matches and lag behind recent room creation or deletion, and it is not an exact-name existence check. Results are paginated to at most 25 rooms per call, and `next` tokens expire and must be reused with the same `limit`.
 */
const action = createAction({
    description: 'Search rooms in a workspace by name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rooms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/searchrooms
            endpoint: `/api/public/v1/search/${encodeURIComponent(input.workspaceId)}/rooms`,
            params: {
                q: input.q,
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.next !== undefined && { next: input.next })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from the Mural room search endpoint.'
            });
        }

        return {
            rooms: parsed.data.value,
            ...(parsed.data.next != null && { next: parsed.data.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
