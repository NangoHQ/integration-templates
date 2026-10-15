import { z } from 'zod';
import { createAction } from 'nango';

const ProviderUserInfoSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    type: z.string().optional()
});

const ProviderRoomSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    favorite: z.boolean().optional(),
    createdOn: z.number(),
    createdBy: ProviderUserInfoSchema.optional(),
    updatedBy: ProviderUserInfoSchema.optional(),
    updatedOn: z.number(),
    type: z.enum(['open', 'private']),
    confidential: z.boolean(),
    workspaceId: z.string(),
    isMember: z.boolean()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderRoomSchema),
    next: z.string().optional()
});

const InputSchema = z
    .object({
        workspaceId: z.string().describe('Unique identifier of the workspace whose open rooms to list. Example: "workspace1234"'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of rooms to return per page (1-100).'),
        cursor: z.string().optional().describe('Opaque pagination token from the previous response nextCursor. Omit for the first page.')
    })
    .describe('Filters for listing the open rooms of a workspace.');

const UserInfoSchema = z
    .object({
        id: z.string().optional().describe('Unique ID of the user.'),
        firstName: z.string().optional().describe('First name of the user.'),
        lastName: z.string().optional().describe('Last name of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        type: z.string().optional().describe('Type of the user, for example "member".')
    })
    .describe('Identifying information for a workspace user.');

const RoomSchema = z
    .object({
        id: z.number().describe('Unique ID of the room.'),
        name: z.string().describe('Name of the room.'),
        description: z.string().describe('Description of the room.'),
        favorite: z.boolean().optional().describe('Whether the room has been marked as a favorite.'),
        createdOn: z.number().describe('Timestamp in milliseconds when the room was created.'),
        createdBy: UserInfoSchema.optional().describe('Member information for the creator of the room.'),
        updatedBy: UserInfoSchema.optional().describe('Collaborator information for the last user that changed the room.'),
        updatedOn: z.number().describe('Timestamp in milliseconds of the last room update.'),
        type: z.enum(['open', 'private']).describe('Whether anyone can join the room ("open") or only invited members ("private").'),
        confidential: z.boolean().describe('Whether the room is confidential. Confidential is an enterprise-only feature.'),
        workspaceId: z.string().describe('ID of the workspace the room belongs to.'),
        isMember: z.boolean().describe('Whether the authenticated user is a member of the room.')
    })
    .describe('An open room in the workspace.');

const OutputSchema = z
    .object({
        items: z.array(RoomSchema).describe('Open rooms returned for this page.'),
        nextCursor: z.string().optional().describe('Opaque token to pass as cursor to fetch the next page. Always present, even on the last page.')
    })
    .describe('A page of open rooms in the workspace.');

/**
 * @tags: [read]
 * @tagReason: Reads the workspace's open rooms; it does not modify any provider data.
 * @pitfalls: nextCursor is returned even on the final page, so an empty items array (not a missing nextCursor) is the only reliable end-of-results signal; keep the same limit when following a cursor or the provider may reject the page.
 */
const action = createAction({
    description: 'List only the open rooms in a workspace (rooms any workspace member can join, as opposed to invitation-only private rooms).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rooms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getworkspaceopenrooms
        const response = await nango.get({
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/rooms/open`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.value.map((room) => ({
                id: room.id,
                name: room.name,
                description: room.description,
                ...(room.favorite !== undefined && { favorite: room.favorite }),
                createdOn: room.createdOn,
                ...(room.createdBy !== undefined && { createdBy: room.createdBy }),
                ...(room.updatedBy !== undefined && { updatedBy: room.updatedBy }),
                updatedOn: room.updatedOn,
                type: room.type,
                confidential: room.confidential,
                workspaceId: room.workspaceId,
                isMember: room.isMember
            })),
            ...(parsed.next !== undefined && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
