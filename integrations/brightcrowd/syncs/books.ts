import { toBook } from '../mappers/to-book.js';
import type { NangoSync, ProxyConfiguration } from '../../models';
import type { BrightCrowdBook } from '../types.js';
// import type { BrightCrowdBook } from '../types';

/**
 * Fetches books from BrightCrowd API
 */

export default async function fetchData(nango: NangoSync) {
    const proxyConfig: ProxyConfiguration = {
        // https://brightcrowd.com/partner-api#/operations/listBooks
        endpoint: '/books',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'nextPageToken',
            cursor_name_in_request: 'pageToken',
            response_path: 'books'
        }
    };
    for await (const books of nango.paginate<BrightCrowdBook>(proxyConfig)) {
        await nango.log(`Processing batch of ${books.length} books`, { level: 'debug' });
        const mappedBooks = books.map(toBook);
        await nango.batchSave(mappedBooks, 'Book');
    }
}
