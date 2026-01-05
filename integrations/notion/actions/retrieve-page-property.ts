import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"'),
    property_id: z.string().describe('The ID or name of the property to retrieve. Example: "title"')
});

const OutputSchema = z.object({
    object: z.string(),
    type: z.string(),
    results: z.array(z.any()).optional(),
    property_item: z.any().optional()
});

const action = createAction({
    description: 'Gets a specific property value from a page with pagination support.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/pages/property',
        group: 'Pages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/retrieve-a-page-property
            endpoint: `v1/pages/${input.page_id}/properties/${input.property_id}`,
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            object: data.object,
            type: data.type,
            results: data.results ?? null,
            property_item: data.property_item ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
