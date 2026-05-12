import { createAction, type NangoAction, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the article to delete')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    id: z.string().describe('The ID of the deleted article')
});

export default createAction({
    description: 'Delete a Help Center article',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-article'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango: NangoAction, input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Articles/deleteArticle
            endpoint: `/articles/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        await nango.delete(proxyConfig);

        return {
            success: true,
            id: input.id
        };
    }
});
