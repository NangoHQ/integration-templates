import type { IdEntity, NangoSync, ProxyConfiguration } from '../../models';
import { toPage } from '../mappers/to-page.js';
// import { pagesSchema } from '../schema.zod.js';
// TODO: Issue: No guarantee metadata will be available
/**
 * Fetches pages from BrightCrowd API
 * Endpoint: GET /partner/pages
 * @see https://api.brightcrowd.com/partner/pages
 */
export default async function fetchData(nango: NangoSync, input: IdEntity) {
    let bookIds: string[] = [];

    if (input.id) {
        bookIds = [input.id];
    } else {
        const metadata = await nango.getMetadata<{ bookIds: string[] }>();
        bookIds = metadata?.bookIds || [];
    }

    if (bookIds.length === 0) {
        await nango.log('No books found.', { level: 'warn' });
        return;
    }

    for (const bookId of bookIds) {
        await fetchPages(nango, { id: bookId });
    }
}

const fetchPages = async (nango: NangoSync, input: IdEntity) => {
    const proxyConfig: ProxyConfiguration = {
        // https://brightcrowd.com/partner-api#/operations/listPages
        endpoint: `partner/books/${input.id}/page`,
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'nextPageToken',
            cursor_name_in_request: 'pageToken',
            response_path: 'data'
        }
    };

    // TODO: Validate that paginate works correctly
    for await (const pagesPage of nango.paginate(proxyConfig)) {
        await nango.log(`Processing batch of ${pagesPage.length} pages`, { level: 'debug' });
        const mappedPages = pagesPage.map(toPage);
        await nango.batchSave(mappedPages, 'Page');
    }
};
