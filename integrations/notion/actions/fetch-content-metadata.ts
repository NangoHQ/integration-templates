import type { NangoAction, ContentMetadata, UrlOrId } from '../../models';

import { urlOrIdSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: UrlOrId): Promise<ContentMetadata> {
    const parsedInput = urlOrIdSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch a database: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch a page'
        });
    }

    let id: string = '';

    if (parsedInput.data.url) {
        id = extractIdFromUrl(parsedInput.data.url);
    } else if (parsedInput.data.id) {
        id = parsedInput.data.id;
    } else {
        throw new Error('Invalid input provided to fetch content metadata');
    }

    try {
        const isPageResponse = await nango.get({
            endpoint: `/v1/pages/${id}`,
            retries: 10
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

    try {
        const isDatabaseResponse = await nango.get({
            endpoint: `/v1/databases/${id}`,
            retries: 10
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

function extractIdFromUrl(url: string): string {
    const idMatch = url.match(/([0-9a-f]{32})/);
    if (idMatch && idMatch.length > 0 && idMatch[1] && idMatch[1].length === 32) {
        return idMatch[1];
    }
    throw new Error('Invalid Notion URL');
}
