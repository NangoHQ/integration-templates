import type { DropboxTemporaryDownloadLink } from '../types.js';
import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch dropbox file
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { path: string }): Promise<string> {
    const proxyConfig = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
        endpoint: `/2/files/get_temporary_link`,
        data: {
            path: input.path
        },
        retries: 3
    };

    const { data } = await nango.post<DropboxTemporaryDownloadLink>(proxyConfig);

    if (!data.metadata.is_downloadable) {
        throw new Error('File is not downloadable');
    }

    const response = await nango.get({
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
        endpoint: data.link,
        responseType: 'arraybuffer',
        retries: 3
    });

    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return buffer.toString('base64');
}

const input = { path: 'your-file-path' };

await run(input);
