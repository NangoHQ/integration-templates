import { createSync } from "nango";
import { toBook } from '../mappers/to-book.js';
import type { ProxyConfiguration } from "nango";
import { BookById, Metadata } from "../models.js";

/**
 * Fetches list of specified books from BrightCrowd API
 */
const sync = createSync({
    description: "Fetches a list of specified books from Brightcrowd.",
    version: "1.0.0",
    frequency: "every day",
    autoStart: false,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/books-by-Id",
        group: "Books"
    }],

    scopes: ["bcb.partner/book.read"],

    models: {
        BookById: BookById
    },

    metadata: Metadata,

    exec: async nango => {
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

        const books: BookById[] = [];

        for (const bookId of bookIds) {
            const proxyConfig: ProxyConfiguration = {
                // https://brightcrowd.com/partner-api#/operations/getBook
                endpoint: `/books/${bookId}`,
                retries: 10
            };
            const { data } = await nango.get(proxyConfig);
            if (typeof bookId === 'string' && data) {
                const mappedBook = toBook(data);
                books.push(mappedBook);
            } else {
                await nango.log('Invalid response data.', { level: 'error' });
            }
        }
        if (books.length > 0) {
            await nango.batchSave(books, 'BookById');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
