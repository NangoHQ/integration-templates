import { createSync } from "nango";
import type { BrightCrowdBookAnalytics } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { BookAnalytics, Metadata } from "../models.js";

/**
 * Fetches book analytics data from the BrightCrowd API and saves it.
 *
 * @param {NangoSync} nango - The NangoSync instance used for fetching data and logging.
 * @returns {Promise<void>} - A promise that resolves when the data fetching and saving is complete.
 */
const sync = createSync({
    description: "Fetches analytics for a specified list of books from Brightcrowd.",
    version: "2.0.0",
    frequency: "every day",
    autoStart: false,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/book-analytics",
        group: "Books"
    }],

    scopes: ["bcb.partner/book.read"],

    models: {
        BookAnalytics: BookAnalytics
    },

    metadata: Metadata,

    exec: async nango => {
        const metadata = await nango.getMetadata();
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
                // https://brightcrowd.com/partner-api#/operations/getBookAnalytics
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
            await nango.batchSave(bookAnalytics, 'BookAnalytics');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
