import type { IdEntity, NangoSync, ProxyConfiguration } from '../../models';
import { toPage } from '../mappers/to-page.js';
import { idEntitySchema } from '../schema.zod.js';
/**
 * Fetches pages from BrightCrowd API
 * Endpoint: GET /partner/pages
 * @see https://api.brightcrowd.com/partner/pages
 */
export default async function fetchData(nango: NangoSync, input: IdEntity) {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch pages: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch pages'
        });
    }

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
}
