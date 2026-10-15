import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural. Example: "nangodev4776.1606743986126"'),
        cursor: z.string().min(1).optional().describe("Opaque pagination token from a previous response's nextCursor. Omit to fetch the first page."),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of members to return per page (1-100). Example: 50')
    })
    .describe('Input for listing the members and guests who have access to a mural.');

const ProviderMemberPermissionsSchema = z.object({
    facilitator: z.boolean().optional().nullable(),
    owner: z.boolean().optional().nullable()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    type: z.string(),
    createdOn: z.number().optional().nullable(),
    permissions: ProviderMemberPermissionsSchema.optional().nullable()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderUserSchema),
    next: z.string().optional().nullable()
});

const MemberPermissionsSchema = z.object({
    facilitator: z.boolean().optional().describe('Whether the user is a facilitator of the mural.'),
    owner: z.boolean().optional().describe('Whether the user is the owner of the mural.')
});

const MemberSchema = z.object({
    id: z.string().describe('Unique identifier of the user.'),
    email: z.string().optional().describe('Email address of the user.'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.'),
    avatar: z.string().optional().describe("URL of the user's avatar image."),
    type: z.string().describe('Collaborator type, either "member" or "guest".'),
    createdOn: z.number().optional().describe('Epoch milliseconds when the user joined the mural, or 0 when no real join timestamp is available.'),
    permissions: MemberPermissionsSchema.optional().describe('Per-mural permission flags for the user.')
});

const OutputSchema = z
    .object({
        members: z.array(MemberSchema).describe('Members and guests with access to the mural.'),
        nextCursor: z
            .string()
            .optional()
            .describe('Opaque token to fetch another page of members. It can still be returned on the final page, so stop when `members` is empty.')
    })
    .describe('A page of members and guests who have access to the mural.');

/**
 * @tags: [read]
 * @tagReason: Only reads the mural member list from the provider; performs no provider mutations.
 * @pitfalls: A `nextCursor` can be returned even on the final page, so use an empty `members` array to detect the end rather than the presence of a token; `createdOn` is `0` when no real join timestamp is available, not an actual epoch-zero date.
 */
const action = createAction({
    description: 'List the members and guests who have access to a specific mural, including facilitator and owner permission flags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getmuralusers
        const response = await nango.get({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/users`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members = providerResponse.value.map((user) => ({
            id: user.id,
            type: user.type,
            ...(user.email != null && { email: user.email }),
            ...(user.firstName != null && { firstName: user.firstName }),
            ...(user.lastName != null && { lastName: user.lastName }),
            ...(user.avatar != null && { avatar: user.avatar }),
            ...(user.createdOn != null && { createdOn: user.createdOn }),
            ...(user.permissions != null && {
                permissions: {
                    ...(user.permissions.facilitator != null && { facilitator: user.permissions.facilitator }),
                    ...(user.permissions.owner != null && { owner: user.permissions.owner })
                }
            })
        }));

        return {
            members,
            ...(providerResponse.next != null && { nextCursor: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
