import { Nango } from '@nangohq/node';
import { mapPage } from '../mappers/to-page.js';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

interface RichPage {
    id: string;
    path: string;
    title: string;
    content: string;
    contentType: string;
    meta: object;
    last_modified: string;
    parent_id?: string | undefined;
}

/**
 * Fetch Notion rich page
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { pageId: string }): Promise<RichPage> {
    const response = await nango.get({
        // https://developers.notion.com/reference/retrieve-a-page
        endpoint: `/v1/pages/${input.pageId}`,
        retries: 3
        // connectionId: 'your-notion-connection-id'
        // providerConfigKey: 'notion'
    });

    const page = response.data;

    // NOTE: Nango SDK is typed a little differently than the internal Nango sync/action object
    // @ts-ignore
    const mappedPage = await mapPage(nango, page);

    return mappedPage;
}

const input = { pageId: 'your-page-id' };
await run(input);
