import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search term to filter designs. Example: "party invites"'),
    design_type: z.string().optional().describe('Filter designs by type. Example: "presentation"'),
    ownership: z.enum(['any', 'owned', 'shared']).optional().describe('Filter by ownership: any, owned, or shared.'),
    continuation: z
        .string()
        .optional()
        .describe('Pagination cursor from the previous response. Example: "RkFGMgXlsVTDbMd:MR3L0QjiaUzycIAjx0yMyuNiV0OildoiOwL0x32G4NjNu4FwtAQNxowUQNMMYN"'),
    sort_by: z
        .enum(['relevance', 'modified_descending', 'modified_ascending', 'title_descending', 'title_ascending'])
        .optional()
        .describe('Sort order for results.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of designs to return (1-100). Default: 25.')
});

const TeamUserSummarySchema = z.object({
    user_id: z.string(),
    team_id: z.string()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const DesignLinksSchema = z.object({
    edit_url: z.string(),
    view_url: z.string()
});

const DesignSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    owner: TeamUserSummarySchema,
    thumbnail: ThumbnailSchema.optional(),
    urls: DesignLinksSchema,
    created_at: z.number(),
    updated_at: z.number(),
    page_count: z.number().optional(),
    design_types: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(DesignSchema),
    continuation: z.string().optional()
});

const action = createAction({
    description: 'List design metadata with optional text search, type, and ownership filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:meta:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/designs/list-designs/
            endpoint: '/rest/v1/designs',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.design_type !== undefined && { design_type: input.design_type }),
                ...(input.ownership !== undefined && { ownership: input.ownership }),
                ...(input.continuation !== undefined && { continuation: input.continuation }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(z.unknown()),
                continuation: z.string().optional()
            })
            .parse(response.data);

        const items = parsed.items.map((item: unknown) => {
            const design = DesignSchema.parse(item);
            return {
                id: design.id,
                ...(design.title !== undefined && { title: design.title }),
                owner: design.owner,
                ...(design.thumbnail !== undefined && { thumbnail: design.thumbnail }),
                urls: design.urls,
                created_at: design.created_at,
                updated_at: design.updated_at,
                ...(design.page_count !== undefined && { page_count: design.page_count }),
                ...(design.design_types !== undefined && { design_types: design.design_types })
            };
        });

        return {
            items,
            ...(parsed.continuation !== undefined && { continuation: parsed.continuation })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
