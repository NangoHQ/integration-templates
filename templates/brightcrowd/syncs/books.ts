import { createSync } from "nango";
import { toBook } from '../mappers/to-book.js';
import type { BrightCrowdBook } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Book } from "../models.js";
import { z } from "zod";

/**
 * Fetches books from BrightCrowd API
 */
const sync = createSync({
    description: "Fetches a list of all books in an account from Brightcrowd.",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/books",
        group: "Books"
    }],

    scopes: ["bcb.partner/book.read"],

    models: {
        Book: Book
    },

    metadata: z.object({}),

    exec: async nango => {
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
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
