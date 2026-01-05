import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page to archive. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    archived: z.boolean()
});

const action = createAction({
    description: 'Moves a page to trash by setting archived to true.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/pages/archive',
        group: 'Pages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/patch-page
            endpoint: `v1/pages/${input.page_id}`,
            data: {
                archived: true
            },
            retries: 3
        };

        const response = await nango.patch(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            archived: data.archived
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
