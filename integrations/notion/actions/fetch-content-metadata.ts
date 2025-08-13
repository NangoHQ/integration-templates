import { createAction } from 'nango';

import { urlOrIdSchema } from '../schema.zod.js';

import { ContentMetadata, UrlOrId } from '../models.js';

const action = createAction({
    description: 'Retrieve the entity type as well as an id for a Notion entity to later call\nfetch-database or fetch-rich-page based on the type.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/contents/single',
        group: 'Contents'
    },

    input: UrlOrId,
    output: ContentMetadata,

    exec: async (nango, input): Promise<ContentMetadata> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: urlOrIdSchema, input });

        let id: string = '';

        if (parsedInput.data.url) {
            id = extractIdFromUrl(parsedInput.data.url);
        } else if (parsedInput.data.id) {
            id = parsedInput.data.id;
        } else {
            throw new Error('Invalid input provided to fetch content metadata');
        }

        // @allowTryCatch
        try {
            const isPageResponse = await nango.get({
                endpoint: `/v1/pages/${id}`,
                retries: 3
            });

            const { data } = isPageResponse;

            const pageData: ContentMetadata = {
                id: data.id,
                path: data.url,
                title: data.properties.title.title[0].plain_text,
                last_modified: data.last_edited_time,
                type: 'page'
            };

            if ('parent' in data && data.parent.page_id) {
                pageData.parent_id = data.parent.page_id;
            }

            return pageData;
        } catch {
            await nango.log(`The passed in id: ${id} is not a page`);
        }

        // @allowTryCatch
        try {
            const isDatabaseResponse = await nango.get({
                endpoint: `/v1/databases/${id}`,
                retries: 3
            });

            const { data } = isDatabaseResponse;

            const databaseData: ContentMetadata = {
                id: data.id,
                path: data.url,
                title: data.title[0].plain_text,
                last_modified: data.last_edited_time,
                type: 'database'
            };

            if ('parent' in data && data.parent.page_id) {
                databaseData.parent_id = data.parent.page_id;
            }
            return databaseData;
        } catch {
            await nango.log(`The passed in id: ${id} is not a database`);
        }

        throw new nango.ActionError({
            message: `The passed in id: ${id} is not a page or a database`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

function extractIdFromUrl(url: string): string {
    const idMatch = url.match(/([0-9a-f]{32})/);
    if (idMatch && idMatch.length > 0 && idMatch[1] && idMatch[1].length === 32) {
        return idMatch[1];
    }
    throw new Error('Invalid Notion URL');
}
