import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('Unique identifier of the room to retrieve. Example: 1791984264781658')
    })
    .describe('Input for retrieving a single room.');

const RoomUserSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the user. Example: "u6ed91a0eb0c5cb4ae8713013"'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.'),
    email: z.string().optional().describe('Email address of the user, when available.'),
    type: z.string().optional().describe('Membership type of the user, for example "member" or "guest".')
});

const RoomSharingSettingsSchema = z.object({
    link: z.string().optional().describe('Invitation link that a member with an account can use to access the room.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the room. Example: 1791984264781658'),
        name: z.string().describe('Name of the room.'),
        description: z.string().describe('Description of the room. Empty string when no description is set.'),
        type: z.enum(['open', 'private']).describe('Whether anyone with workspace access can join the room ("open") or only invited users can ("private").'),
        confidential: z.boolean().describe('Whether the room is confidential (an enterprise-only feature).'),
        workspaceId: z.string().describe('Unique identifier of the workspace the room belongs to. Example: "nangodev4776"'),
        isMember: z.boolean().describe('Whether the authenticated user is a member of the room.'),
        favorite: z.boolean().optional().describe('Whether the authenticated user has marked the room as a favorite.'),
        createdOn: z.number().describe('Room creation time as Unix epoch milliseconds.'),
        updatedOn: z.number().describe('Time of the last room update as Unix epoch milliseconds.'),
        createdBy: RoomUserSchema.describe('User who created the room.'),
        updatedBy: RoomUserSchema.describe('User who last updated the room.'),
        sharingSettings: RoomSharingSettingsSchema.optional().describe('Sharing settings, only returned when the authenticated user owns the room.')
    })
    .describe('A room in a Mural workspace.');

const ProviderRoomResponseSchema = z.object({
    value: OutputSchema
});

/**
 * @tags: [read]
 * @tagReason: Fetches an existing room without creating, updating, or deleting any provider data.
 * @pitfalls: A room the caller cannot access returns a 403 (not 404), so permission failures are distinguishable from missing rooms; sharingSettings is only returned when the caller owns the room.
 */
const action = createAction({
    description: 'Retrieve a single room by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rooms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getroominfobyid
        const response = await nango.get({
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(String(input.roomId))}`,
            retries: 3
        });

        const providerResponse = ProviderRoomResponseSchema.parse(response.data);

        return providerResponse.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
