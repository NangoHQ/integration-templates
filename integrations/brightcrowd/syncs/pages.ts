import { createSync } from 'nango';
import { toPage } from '../mappers/to-page.js';
import type { BrightCrowdPage } from '../types.js';
import type { ProxyConfiguration } from 'nango';
import { Page, Metadata } from '../models.js';

/**
 * Fetches pages from BrightCrowd API
 */
const sync = createSync({
    description: 'Fetches a list of all pages in a book from Brightcrowd.',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: false,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/pages',
            group: 'Books'
        }
    ],

    scopes: ['bcb.partner/page.read'],

    models: {
        Page: Page
    },

    metadata: Metadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata) {
            await nango.log('No Metadata found.', { level: 'warn' });
            return;
        }
        const { bookIds } = metadata;

        if (!bookIds || !bookIds.length) {
            await nango.log('No books found.', { level: 'warn' });
            return;
        }

        for (const bookId of bookIds) {
            await fetchPages(nango, bookId);
        }

        await nango.deleteRecordsFromPreviousExecutions('Page');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

const fetchPages = async (nango: NangoSyncLocal, id: string) => {
    const proxyConfig: ProxyConfiguration = {
        // https://brightcrowd.com/partner-api#/operations/listPages
        endpoint: `/books/${id}/pages`,
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'nextPageToken',
            cursor_name_in_request: 'pageToken',
            response_path: 'pages'
        }
    };

    for await (const pages of nango.paginate<BrightCrowdPage>(proxyConfig)) {
        await nango.log(`Processing batch of ${pages.length} pages`, { level: 'debug' });
        const mappedPages = pages.map(toPage);
        await nango.batchSave(mappedPages, 'Page');
    }
};
