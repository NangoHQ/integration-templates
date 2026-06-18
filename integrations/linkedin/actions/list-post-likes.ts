import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    target: z.string().describe('The URN of the share, UGC post, or comment. Example: "urn:li:share:123"'),
    start: z.number().optional().describe('Pagination start offset. Omit for the first page.'),
    count: z.number().optional().describe('Number of reactions to return per page. Max recommended is 600.')
});

const ActorInfoSchema = z.object({
    actor: z.string().optional(),
    time: z.number().optional()
});

const ReactionSchema = z.object({
    id: z.string().optional(),
    reactionType: z.string().optional(),
    root: z.string().optional(),
    created: ActorInfoSchema.optional(),
    lastModified: ActorInfoSchema.optional()
});

const PagingSchema = z.object({
    start: z.number().optional(),
    count: z.number().optional(),
    links: z.array(z.unknown()).optional(),
    total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    paging: PagingSchema.optional(),
    elements: z.array(ReactionSchema).optional()
});

const OutputSchema = z.object({
    elements: z.array(ReactionSchema),
    paging: PagingSchema.optional(),
    next_start: z.number().optional()
});

const action = createAction({
    description: 'List reactions on a LinkedIn post or comment thread. Returns all reaction types (LIKE, PRAISE, EMPATHY, APPRECIATION, etc.).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_member_social', 'w_member_social', 'r_organization_social', 'r_organization_social_feed'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/reactions-api
            endpoint: `/rest/reactions/(entity:${encodeURIComponent(input.target)})`,
            params: {
                q: 'entity',
                ...(input.start !== undefined && { start: String(input.start) }),
                ...(input.count !== undefined && { count: String(input.count) })
            },
            headers: {
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No data returned for the specified target.',
                target: input.target
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const elements = providerResponse.elements ?? [];
        const paging = providerResponse.paging;

        const total = paging?.total ?? 0;
        const currentStart = paging?.start ?? 0;
        const currentCount = paging?.count ?? elements.length;
        const nextStart = currentStart + currentCount < total ? currentStart + currentCount : undefined;

        return {
            elements,
            ...(paging && { paging }),
            ...(nextStart !== undefined && { next_start: nextStart })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
