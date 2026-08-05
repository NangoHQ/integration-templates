import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of teams to return per page.')
});

const ProviderTeamAttributesSchema = z
    .object({
        name: z.string(),
        handle: z.string(),
        description: z.string().nullable().optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        user_count: z.number().optional(),
        link_count: z.number().optional()
    })
    .passthrough();

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderTeamAttributesSchema
});

const ProviderPaginationSchema = z.object({
    next_offset: z.number().nullable().optional()
});

const ProviderMetaSchema = z.object({
    pagination: ProviderPaginationSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTeamSchema),
    meta: ProviderMetaSchema.optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    user_count: z.number().optional(),
    link_count: z.number().optional()
});

const OutputSchema = z.object({
    teams: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List teams in this organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/teams/#get-all-teams
            endpoint: 'v2/team',
            params: {
                ...(input.cursor !== undefined && { 'page[offset]': input.cursor }),
                ...(input.limit !== undefined && { 'page[limit]': String(input.limit) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const teams = providerResponse.data.map((item) => ({
            id: item.id,
            name: item.attributes.name,
            handle: item.attributes.handle,
            ...(item.attributes.description != null && { description: item.attributes.description }),
            ...(item.attributes.created_at !== undefined && { created_at: item.attributes.created_at }),
            ...(item.attributes.modified_at !== undefined && { modified_at: item.attributes.modified_at }),
            ...(item.attributes.user_count !== undefined && { user_count: item.attributes.user_count }),
            ...(item.attributes.link_count !== undefined && { link_count: item.attributes.link_count })
        }));

        return {
            teams,
            ...(providerResponse.meta?.pagination?.next_offset != null && {
                next_cursor: String(providerResponse.meta.pagination.next_offset)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
