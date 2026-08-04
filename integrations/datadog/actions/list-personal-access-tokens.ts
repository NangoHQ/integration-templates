import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_size: z.number().optional().describe('Number of items per page. Example: 10'),
    page_number: z.number().optional().describe('Page number to fetch. Example: 0')
});

const ProviderTokenSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z
        .object({
            created_at: z.string().optional(),
            expires_at: z.string().nullable().optional(),
            last_used_at: z.string().nullable().optional(),
            modified_at: z.string().optional(),
            name: z.string().optional(),
            public_portion: z.string().optional(),
            scopes: z.array(z.string()).optional()
        })
        .optional(),
    relationships: z
        .object({
            owned_by: z
                .object({
                    data: z
                        .object({
                            id: z.string(),
                            type: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTokenSchema),
    meta: z
        .object({
            page: z
                .object({
                    total_filtered_count: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const OutputTokenSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    expires_at: z.string().optional(),
    last_used_at: z.string().optional(),
    modified_at: z.string().optional(),
    public_portion: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    owned_by_user_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputTokenSchema),
    total_count: z.number().optional(),
    page_number: z.number().optional()
});

const action = createAction({
    description: 'List personal access tokens',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/personal-access-tokens/#list-personal-access-tokens
            endpoint: 'v2/personal_access_tokens',
            params: {
                ...(input.page_size !== undefined && { 'page[size]': input.page_size }),
                ...(input.page_number !== undefined && { 'page[number]': input.page_number })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((token) => ({
            id: token.id,
            ...(token.type !== undefined && { type: token.type }),
            ...(token.attributes?.name !== undefined && { name: token.attributes.name }),
            ...(token.attributes?.created_at !== undefined && { created_at: token.attributes.created_at }),
            ...(token.attributes?.expires_at != null && { expires_at: token.attributes.expires_at }),
            ...(token.attributes?.last_used_at != null && { last_used_at: token.attributes.last_used_at }),
            ...(token.attributes?.modified_at !== undefined && { modified_at: token.attributes.modified_at }),
            ...(token.attributes?.public_portion !== undefined && { public_portion: token.attributes.public_portion }),
            ...(token.attributes?.scopes !== undefined && { scopes: token.attributes.scopes }),
            ...(token.relationships?.owned_by?.data?.id !== undefined && { owned_by_user_id: token.relationships.owned_by.data.id })
        }));

        return {
            items,
            ...(providerResponse.meta?.page?.total_filtered_count !== undefined && {
                total_count: providerResponse.meta.page.total_filtered_count
            }),
            ...(input.page_number !== undefined && { page_number: input.page_number })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
