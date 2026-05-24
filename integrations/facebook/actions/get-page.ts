import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Facebook Page ID. Example: "1148671018324630"'),
    fields: z.string().optional().describe('Comma-separated fields to retrieve. Example: "id,name,category,fan_count,about,link"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    category: z.string().optional(),
    fan_count: z.number().optional(),
    about: z.string().optional(),
    link: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    category: z.string().optional(),
    fanCount: z.number().optional(),
    about: z.string().optional(),
    link: z.string().optional()
});

const action = createAction({
    description: 'Retrieve Facebook Page metadata by page ID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_read_engagement'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/page/
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.pageId)}`,
            params: {
                ...(input.fields !== undefined && input.fields !== '' && { fields: input.fields })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page not found',
                pageId: input.pageId
            });
        }

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            ...(providerPage.name !== undefined && { name: providerPage.name }),
            ...(providerPage.category !== undefined && { category: providerPage.category }),
            ...(providerPage.fan_count !== undefined && { fanCount: providerPage.fan_count }),
            ...(providerPage.about !== undefined && { about: providerPage.about }),
            ...(providerPage.link !== undefined && { link: providerPage.link })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
