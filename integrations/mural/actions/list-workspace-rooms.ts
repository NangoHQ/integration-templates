import { z } from 'zod';
import { createAction } from 'nango';

const RoomUserSchema = z.object({
    id: z.string().optional().describe('ID of the user. Example: "u6ed91a0eb0c5cb4ae8713013"'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.'),
    email: z.string().optional().describe('Email address of the user, when available.'),
    type: z.string().optional().describe('User type. Example: "member"')
});

const RoomSchema = z.object({
    id: z.number().describe('Numeric ID of the room. Example: 1791984264781658'),
    name: z.string().describe('Name of the room.'),
    description: z.string().describe('Description of the room, an empty string when unset.'),
    type: z.string().describe('Room type. Example: "open"'),
    confidential: z.boolean().describe('Whether the room is confidential (enterprise plans only).'),
    workspaceId: z.string().describe('ID of the workspace the room belongs to. Example: "nangodev4776"'),
    isMember: z.boolean().describe('Whether the authenticated user is a member of the room.'),
    favorite: z.boolean().optional().describe('Whether the authenticated user has favorited the room.'),
    createdOn: z.number().describe('Creation time as a Unix epoch in milliseconds. Example: 1791984264781'),
    createdBy: RoomUserSchema.describe('User who created the room.'),
    updatedOn: z.number().describe('Last update time as a Unix epoch in milliseconds. Example: 1791984264781'),
    updatedBy: RoomUserSchema.describe('User who last updated the room.')
});

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace whose rooms should be listed. Example: "nangodev4776"'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of rooms to return per page (1-100). Defaults to 100.'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe(
                'Opaque pagination cursor (`nextCursor`) from a previous response. Omit for the first page. Must be replayed with the same `limit` used to obtain it.'
            )
    })
    .describe('Input for listing the rooms of a workspace.');

const OutputSchema = z
    .object({
        rooms: z.array(RoomSchema).describe('Rooms in the workspace for this page.'),
        nextCursor: z
            .string()
            .optional()
            .describe(
                'Cursor for another page; pass it as `cursor` on the next call. It can still be returned on the final page, so stop when `rooms` is empty.'
            )
    })
    .describe('A page of rooms in the workspace along with a cursor for the next page.');

const ProviderResponseSchema = z.object({
    value: z.array(RoomSchema),
    next: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists rooms in a workspace with a read-only provider request and never mutates provider state.
 * @pitfalls: A `nextCursor` can be returned even when the page already contains all rooms, so keep requesting until `rooms` is empty; when following a cursor, pass the same `limit` used to obtain it or the request is rejected.
 */
const action = createAction({
    description: 'List every room (folder/container) in a workspace.',
    version: '1.0.0',
    scopes: ['rooms:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getroomsforworkspace
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/rooms`,
            params: {
                limit: input.limit ?? 100,
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            rooms: providerResponse.value,
            ...(providerResponse.next != null && { nextCursor: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
