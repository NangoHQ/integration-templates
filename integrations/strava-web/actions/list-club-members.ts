import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    club_id: z.number().describe('Club ID. Example: 1'),
    page: z.number().optional().describe('Page number. Defaults to 1.'),
    per_page: z.number().optional().describe('Number of items per page. Defaults to 30.')
});

const ProviderMemberSchema = z
    .object({
        resource_state: z.number().optional(),
        firstname: z.string().optional(),
        lastname: z.string().optional(),
        member: z.string().optional(),
        membership: z.string().optional(),
        admin: z.boolean().optional(),
        owner: z.boolean().optional()
    })
    .passthrough();

const MemberSchema = z.object({
    resource_state: z.number().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    membership: z.string().optional(),
    admin: z.boolean().optional(),
    owner: z.boolean().optional()
});

const ListOutputSchema = z.object({
    items: z.array(MemberSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: "List a club's members.",
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Clubs-getClubMembersById
            endpoint: `/api/v3/clubs/${encodeURIComponent(String(input.club_id))}/members`,
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const providerMembers = z.array(ProviderMemberSchema).parse(response.data);
        const items = providerMembers.map((parsed) => ({
            resource_state: parsed.resource_state,
            firstname: parsed.firstname,
            lastname: parsed.lastname,
            membership: parsed.membership ?? parsed.member,
            admin: parsed.admin,
            owner: parsed.owner
        }));

        const perPage = input.per_page ?? 30;
        const currentPage = input.page ?? 1;
        const next_page = items.length === perPage ? currentPage + 1 : undefined;

        return {
            items,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
