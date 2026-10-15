import { z } from 'zod';
import { createAction } from 'nango';

const UserInfoSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the user.'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.'),
    email: z.string().optional().describe('Email address of the user.'),
    type: z.string().optional().describe('Membership type of the user within the workspace.')
});

const RoomSchema = z
    .object({
        id: z.number().describe('Unique numeric identifier of the room.'),
        name: z.string().optional().describe('Display name of the room.'),
        description: z.string().optional().describe('Description of the room.'),
        type: z.string().optional().describe('Access type of the room: "open" for workspace collaborators or "private" for invited members only.'),
        confidential: z.boolean().optional().describe('Whether the room is confidential (enterprise workspaces only).'),
        favorite: z.boolean().optional().describe('Whether the room is marked as a favorite for the authenticated user.'),
        isMember: z.boolean().optional().describe('Whether the authenticated user is a member of the room.'),
        workspaceId: z.string().optional().describe('Unique identifier of the workspace that owns the room.'),
        createdOn: z.number().optional().describe('Creation timestamp in Unix epoch milliseconds.'),
        updatedOn: z.number().optional().describe('Last update timestamp in Unix epoch milliseconds.'),
        createdBy: UserInfoSchema.optional().describe('User who created the room.'),
        updatedBy: UserInfoSchema.optional().describe('User who last updated the room.'),
        sharingSettings: z
            .object({
                link: z.string().optional().describe('Invitation link that a member with an account can use to access the room.')
            })
            .optional()
            .describe('Sharing settings, only returned when the authenticated user owns the room.')
    })
    .describe('A Mural room inside a workspace.');

const UpdateRoomResponseSchema = z.object({
    value: RoomSchema
});

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('Unique numeric identifier of the room to update. Example: 1791984264781658'),
        name: z.string().optional().describe('New display name for the room.'),
        description: z.string().optional().describe('New description for the room. Pass an empty string to clear the description.'),
        favorite: z.boolean().optional().describe('Set to true to mark the room as a favorite for the authenticated user, false to unmark it.'),
        type: z
            .enum(['open', 'private'])
            .optional()
            .describe('New access type: "open" lets any workspace member join, "private" restricts the room to invited members only.')
    })
    .describe('Fields to change on a room. This is a partial update: omitted fields keep their current values.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing room's name, description, favorite flag, or access type on the provider; nothing is deleted, so it is not destructive.
 */
const action = createAction({
    description: 'Update a room name or description (partial merge).',
    version: '1.0.0',
    scopes: ['rooms:read', 'rooms:write'],
    input: InputSchema,
    output: RoomSchema,

    exec: async (nango, input): Promise<z.infer<typeof RoomSchema>> => {
        const data: { name?: string; description?: string; favorite?: boolean; type?: 'open' | 'private' } = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.description !== undefined) {
            data.description = input.description;
        }
        if (input.favorite !== undefined) {
            data.favorite = input.favorite;
        }
        if (input.type !== undefined) {
            data.type = input.type;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'Provide at least one of name, description, favorite, or type to update the room.'
            });
        }

        const roomId = encodeURIComponent(String(input.roomId));

        // https://developers.mural.co/public/reference/updateroombyid
        await nango.patch({
            endpoint: `/api/public/v1/rooms/${roomId}`,
            data,
            retries: 3
        });

        // Re-read the room because the PATCH response body can echo the pre-update state.
        // https://developers.mural.co/public/reference/getroominfobyid
        const response = await nango.get({
            endpoint: `/api/public/v1/rooms/${roomId}`,
            retries: 3
        });

        const parsed = UpdateRoomResponseSchema.parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
