import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    role: z.string().optional().describe('Filters for members of the specified recruiting role. Can be simple, admin or reviewer.'),
    shortcode: z.string().optional().describe('Filters for a specific job; only collaborators will be returned.'),
    email: z.string().optional().describe('Filters for members with the specified email.'),
    name: z.string().optional().describe('Filters for members with the specified full name (exact match).'),
    status: z.enum(['active', 'inactive', 'all']).optional().describe('Filters by status. Possible values: active, inactive, all. Default: active.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Pass the next_cursor value.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of members to retrieve per page. Default: 50.')
});

const MemberSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        headline: z.string().nullable().optional(),
        email: z.string(),
        roles: z.array(z.string()).optional(),
        active: z.boolean().optional(),
        collaboration_rules: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(MemberSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List account members.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 50;
        const status = input.status ?? 'active';

        const params: Record<string, string | number> = {
            limit,
            ...(input.role !== undefined && { role: input.role }),
            ...(input.shortcode !== undefined && { shortcode: input.shortcode }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.name !== undefined && { name: input.name }),
            status,
            ...(input.cursor !== undefined && { since_id: input.cursor })
        };

        const response = await nango.get({
            // https://workable.readme.io/reference/members
            endpoint: '/spi/v3/members',
            params,
            retries: 3
        });

        const parsedResponse = z
            .object({
                members: z.array(z.unknown())
            })
            .parse(response.data);

        const members = parsedResponse.members.map((item) => MemberSchema.parse(item));

        let nextCursor: string | undefined;
        const lastMember = members[members.length - 1];
        if (members.length === limit && lastMember !== undefined) {
            nextCursor = lastMember.id;
        }

        return {
            items: members,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
