import type { NangoAction, ProxyConfiguration } from '../../models';
import type { DropboxTemporaryDownloadLink } from '../types.js';

export default async function runAction(nango: NangoAction, input: string): Promise<string> {
    if (!input || typeof input !== 'string') {
        throw new Error('Missing or invalid input: a file ID is required and should be a string');
    }

    const proxyConfig: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
        endpoint: `/2/files/get_temporary_link`,
        data: {
            path: input
        },
        retries: 10
    };

    const { data } = await nango.post<DropboxTemporaryDownloadLink>(proxyConfig);

    if (!data.metadata.is_downloadable) {
        throw new nango.ActionError({
            message: 'File is not downloadable',
            data: data.metadata
        });
    }

    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
        endpoint: data.link,
        responseType: 'arraybuffer',
        retries: 10
    };

    const response = await nango.get(config);

    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return buffer.toString('base64');
}
