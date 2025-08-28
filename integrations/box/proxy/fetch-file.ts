import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch box file
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { id: string }): Promise<string> {
    const response = await nango.get({
        // https://developer.box.com/reference/get-files-id-content/
        endpoint: `/2.0/files/${input.id}/content`,
        responseType: 'stream',
        retries: 3,
        // connectionId: 'your-notion-connection-id'
        // providerConfigKey: 'notion'
    });

    const chunks: Buffer[] = [];

    for await (const chunk of response.data) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('base64');
}

const input = { id: 'your-file-id' };

await run(input);
