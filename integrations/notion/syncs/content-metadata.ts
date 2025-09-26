import { createSync } from 'nango';
import type { Page, Database, BlockPage } from '../types.js';
import { fetchBlocks } from '../utils.js';

import { ContentMetadata } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Sync pages and databases metadata to further fetch the content\nusing a dedicated action',
    version: '2.0.0',
    frequency: 'every 1h',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/contents',
            group: 'Contents'
        }
    ],

    models: {
        ContentMetadata: ContentMetadata
    },

    metadata: z.object({}),

    exec: async (nango) => {
        for await (const pages of nango.paginate({
            method: 'post',
            endpoint: '/v1/search',
            paginate: {
                response_path: 'results'
            },
            retries: 10
        })) {
            const pagesAndDatabases = pages.filter(
                (result: Page | Database) => result.parent.type !== 'database_id' && (result.object === 'database' || result.parent.type !== 'page_id')
            );

            const objects: ContentMetadata[] = pagesAndDatabases.map((page: Page | Database) => {
                const metadata: ContentMetadata = {
                    id: page.id,
                    path: page.url,
                    type: page.object === 'database' ? 'database' : 'page',
                    last_modified: page.last_edited_time
                };

                if (
                    'properties' in page &&
                    'title' in page.properties &&
                    'title' in page.properties.title &&
                    Array.isArray(page.properties.title.title) &&
                    page.properties.title.title.length > 0 &&
                    typeof page.properties.title.title[0] === 'object' &&
                    page.properties.title.title[0] !== null &&
                    'plain_text' in page.properties.title.title[0] &&
                    typeof page.properties.title.title[0].plain_text === 'string'
                ) {
                    metadata.title = page.properties.title.title[0].plain_text;
                }

                if ('title' in page && page.title[0] && page.title[0].plain_text) {
                    metadata.title = page.title[0].plain_text;
                }

                if ('parent' in page && page.parent.page_id) {
                    metadata.parent_id = page.parent.page_id;
                }

                return metadata;
            });

            const pagesOnly = objects.filter((object) => object.type === 'page');

            await nango.batchSave(objects, 'ContentMetadata');

            await recursiveFetchSubPages(nango, pagesOnly);
        }
    await nango.deleteRecordsFromPreviousExecutions("ContentMetadata");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function recursiveFetchSubPages(nango: NangoSyncLocal, pages: ContentMetadata[]): Promise<void> {
    for (const page of pages) {
        const blocks = await fetchBlocks(nango, page.id);
        const subPagesBlocks = blocks.filter((block) => block.type === 'child_page');
        await nango.log(`Fetched blocks for "${page.title}" with id ${page.id} and found ${subPagesBlocks.length} sub page blocks.`);
        const contentMetadata = subPagesBlocks.map(mapBlockToContentMetadata);
        if (contentMetadata.length > 0) {
            await nango.batchSave(contentMetadata, 'ContentMetadata');
        }
        await recursiveFetchSubPages(nango, contentMetadata);
    }
}

function mapBlockToContentMetadata(block: BlockPage): ContentMetadata {
    return {
        id: block.id,
        type: 'page',
        title: block.child_page.title,
        last_modified: block.last_edited_time,
        parent_id: block.parent.page_id
    };
}
