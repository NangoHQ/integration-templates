import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"'),
    sortBy: z.enum(['name', 'createdAt']).optional().describe('Sort order: name or createdAt'),
    limit: z.number().optional().describe('Maximum number of results per page'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to pageToken.')
});

const PageReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string()
});

const FormulaSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    parent: PageReferenceSchema.optional()
});

const ListOutputSchema = z.object({
    items: z.array(FormulaSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List named formulas in a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/list-formulas'
    },

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Formulas/operation/listFormulas
            endpoint: `/docs/${encodeURIComponent(input.docId)}/formulas`,
            params: {
                ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response from Coda API'
            });
        }

        const ProviderResponseSchema = z.object({
            items: z.array(
                z
                    .object({
                        id: z.string(),
                        type: z.string(),
                        href: z.string(),
                        name: z.string(),
                        parent: PageReferenceSchema.optional()
                    })
                    .passthrough()
            ),
            nextPageToken: z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                type: item.type,
                href: item.href,
                name: item.name,
                ...(item.parent !== undefined && { parent: item.parent })
            })),
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
