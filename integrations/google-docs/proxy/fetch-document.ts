import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch document
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { id: string }): Promise<unknown> {
    const response = await nango.get({
        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
        endpoint: `/v1/documents/${encodeURIComponent(input.id)}`,
        params: {
            includeTabsContent: 'true'
        },
        retries: 3
        // connectionId: 'your-connection-id'
        // providerConfigKey: 'google-docs'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to fetch document: Status Code ${response.status}`);
    }

    return response.data;
}

const input = { id: 'your-document-id' }; // Replace with your actual document ID

await run(input);
