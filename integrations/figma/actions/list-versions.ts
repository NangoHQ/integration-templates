import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('File key or branch key. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    page_size: z.number().int().positive().max(50).optional().describe('Number of items per page. Max 50.'),
    cursor: z.string().optional().describe('Pagination cursor (version ID) from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ProviderVersionSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    user: ProviderUserSchema,
    thumbnail_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    versions: z.array(ProviderVersionSchema),
    pagination: z
        .object({
            prev_page: z.string().optional(),
            next_page: z.string().optional()
        })
        .optional()
});

const OutputVersionSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().optional(),
    description: z.string().optional(),
    user: z.object({
        id: z.string(),
        handle: z.string(),
        img_url: z.string()
    }),
    thumbnail_url: z.string().optional()
});

const OutputSchema = z.object({
    versions: z.array(OutputVersionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List versions from Figma.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_versions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.figma.com/docs/rest-api/version-history-endpoints/
        const response = await nango.get({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/versions`,
            params: {
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextPageUrl = providerResponse.pagination?.next_page;
        let nextCursor: string | undefined;
        if (nextPageUrl) {
            const url = new URL(nextPageUrl);
            const afterParam = url.searchParams.get('after');
            if (afterParam) {
                nextCursor = afterParam;
            }
        }

        return {
            versions: providerResponse.versions.map((version) => ({
                id: version.id,
                created_at: version.created_at,
                ...(version.label != null && { label: version.label }),
                ...(version.description != null && { description: version.description }),
                user: version.user,
                ...(version.thumbnail_url != null && { thumbnail_url: version.thumbnail_url })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
