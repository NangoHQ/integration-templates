import type { NangoSync, ProxyConfiguration, Metadata } from '../../models';
import { toPage } from '../mappers/to-page.js';
import type { BrightCrowdPage } from '../types';
/**
 * Fetches pages from BrightCrowd API
 */
export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<Metadata>();

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
}

const fetchPages = async (nango: NangoSync, id: string) => {
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
