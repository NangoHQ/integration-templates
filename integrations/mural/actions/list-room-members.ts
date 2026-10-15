import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('Numeric ID of the room whose members should be listed. Example: 1608152669000'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of members to return in a single page (1-100). Omit to use the provider default.'),
        cursor: z.string().min(1).optional().describe('Opaque pagination token returned as `nextCursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing the members who have access to a Mural room.');

const ProviderRoomMemberSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.string(),
    type: z.enum(['member', 'guest']),
    createdOn: z.number().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderRoomMemberSchema),
    next: z.string().optional()
});

const RoomMemberSchema = z.object({
    id: z.string().describe('Unique identifier of the room member.'),
    email: z.string().optional().describe('Email address of the member, when returned by Mural.'),
    firstName: z.string().describe('First name of the member.'),
    lastName: z.string().describe('Last name of the member.'),
    avatar: z.string().describe("URL of the member's avatar image."),
    type: z.enum(['member', 'guest']).describe('Whether the user is a workspace member or a guest.'),
    createdOn: z.number().optional().describe('Member creation timestamp in Unix epoch milliseconds as reported by Mural (may be 0 when unknown).')
});

const OutputSchema = z
    .object({
        members: z.array(RoomMemberSchema).describe('Members with access to the room.'),
        nextCursor: z.string().optional().describe('Pagination token for the next page of members; pass it back as `cursor` on the next call.')
    })
    .describe('A page of members with access to a Mural room, plus the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads the room membership from the provider without creating, updating, or deleting any data.
 * @pitfalls: Email invitations do not appear as members until the invitee accepts, so a just-invited user can be missing from the list even though the invitation succeeded.
 */
const action = createAction({
    description: 'List the members who have access to a room.',
    version: '1.0.0',
    scopes: ['users:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getroommembers
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(String(input.roomId))}/users`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            members: providerResponse.value.map((member) => ({
                id: member.id,
                ...(member.email !== undefined && { email: member.email }),
                firstName: member.firstName,
                lastName: member.lastName,
                avatar: member.avatar,
                type: member.type,
                ...(member.createdOn !== undefined && { createdOn: member.createdOn })
            })),
            ...(providerResponse.next !== undefined && { nextCursor: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
