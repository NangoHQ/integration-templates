import { z } from 'zod';
import { createAction } from 'nango';

const RoomTypeSchema = z.enum(['open', 'private']);

const ProviderUserInfoSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    type: z.string()
});

const ProviderRoomSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    favorite: z.boolean(),
    type: RoomTypeSchema,
    confidential: z.boolean(),
    workspaceId: z.string(),
    isMember: z.boolean(),
    createdOn: z.number(),
    updatedOn: z.number(),
    createdBy: ProviderUserInfoSchema,
    updatedBy: ProviderUserInfoSchema
});

const ProviderCreateRoomResponseSchema = z.object({
    value: ProviderRoomSchema
});

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace to create the room in. Example: "nangodev4776"'),
        name: z.string().describe('Name of the new room. Example: "Management room"'),
        type: z.enum(['open', 'private']).describe('Room visibility: "open" lets any workspace member join, "private" allows only invited members'),
        description: z.string().optional().describe('Description of the room. Example: "This room is for deciding on Q4 goals"'),
        confidential: z
            .boolean()
            .optional()
            .describe('When true, marks the room confidential. Confidential rooms are for enterprise customers only and cannot generate a share link')
    })
    .describe('Parameters for creating a room in a workspace');

const UserInfoSchema = z.object({
    id: z.string().describe('ID of the user. Example: "u6ed91a0eb0c5cb4ae8713013"'),
    firstName: z.string().describe('First name of the user'),
    lastName: z.string().describe('Last name of the user'),
    email: z.string().describe('Email address of the user'),
    type: z.string().describe('User type, e.g. "member"')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the created room'),
        name: z.string().describe('Name of the room'),
        description: z.string().describe('Description of the room'),
        favorite: z.boolean().describe('Whether the room is marked as a favorite'),
        type: z.enum(['open', 'private']).describe('Room visibility'),
        confidential: z.boolean().describe('Whether the room is confidential'),
        workspaceId: z.string().describe('ID of the workspace the room belongs to'),
        isMember: z.boolean().describe('Whether the authenticated user is a member of the room'),
        createdOn: z.number().describe('Creation timestamp in epoch milliseconds'),
        updatedOn: z.number().describe('Last update timestamp in epoch milliseconds'),
        createdBy: UserInfoSchema.describe('User who created the room'),
        updatedBy: UserInfoSchema.describe('User who last updated the room')
    })
    .describe('The newly created room');

/**
 * @tags: [write]
 * @tagReason: Creates a new room in the provider workspace.
 * @pitfalls: Set confidential only on enterprise workspaces: the provider documents it as enterprise-only and may reject it elsewhere.
 */
const action = createAction({
    description: 'Create a room in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/createroom
        const response = await nango.post({
            endpoint: '/api/public/v1/rooms',
            data: {
                name: input.name,
                type: input.type,
                workspaceId: input.workspaceId,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.confidential !== undefined && { confidential: input.confidential })
            },
            // Creating a room is not idempotent: a retry after a lost response would create a duplicate room.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderCreateRoomResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Room was not created: the API response did not contain a room.'
            });
        }

        const room = parsed.data.value;

        return {
            id: room.id,
            name: room.name,
            description: room.description,
            favorite: room.favorite,
            type: room.type,
            confidential: room.confidential,
            workspaceId: room.workspaceId,
            isMember: room.isMember,
            createdOn: room.createdOn,
            updatedOn: room.updatedOn,
            createdBy: room.createdBy,
            updatedBy: room.updatedBy
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
