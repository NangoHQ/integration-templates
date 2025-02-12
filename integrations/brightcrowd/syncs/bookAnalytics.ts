import type { Metadata, NangoSync, ProxyConfiguration, BookAnalytics } from '../../models';
import type { BrightCrowdBookAnalytics } from '../types';

/**
 * Fetches book analytics data from the BrightCrowd API and saves it.
 *
 * @param {NangoSync} nango - The NangoSync instance used for fetching data and logging.
 * @returns {Promise<void>} - A promise that resolves when the data fetching and saving is complete.
 */
export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<Metadata>();
    if (!metadata) {
        await nango.log('No Metadata found.', { level: 'warn' });
        return;
    }

    const { bookIds, timeframe = '30days' } = metadata;
    if (!bookIds || !bookIds.length) {
        await nango.log('No books found.', { level: 'warn' });
        return;
    }
    const bookAnalytics: BookAnalytics[] = [];

    for (const bookId of bookIds) {
        const proxyConfig: ProxyConfiguration = {
            // https://brightcrowd.com/partner-api#/operations/listBooks
            endpoint: `/books/${bookId}/analytics`,
            retries: 10,
            params: {
                timeframe: timeframe
            }
        };
        const { data } = await nango.get<BrightCrowdBookAnalytics>(proxyConfig);
        if (typeof bookId === 'string' && data) {
            await nango.log(`Processing analytics for book ${bookId}`, { level: 'debug' });
            const mappedBook = { id: bookId, ...data };
            bookAnalytics.push(mappedBook);
        } else {
            await nango.log('Invalid bookId or data.', { level: 'error' });
        }
    }
    if (bookAnalytics.length > 0) {
        await nango.log(`Saving ${bookAnalytics.length} book analytics`, { level: 'debug' });
        await nango.batchSave<BookAnalytics>(bookAnalytics, 'BookAnalytics');
    }
}
