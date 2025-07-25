import { toBook } from '../mappers/to-book.js';
import type { Metadata, NangoSync, ProxyConfiguration, Book } from '../../models.js';

/**
 * Fetches list of specified books from BrightCrowd API
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

    const books: Book[] = [];

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
        await nango.batchSave(books, 'Book');
    }
}
