import type { IdEntity, NangoAction, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<string> {
    if (!input || !input.id) {
        throw new Error('Missing or invalid input: a file id is required and should be a string');
    }

    const proxy: ProxyConfiguration = {
        // https://developer.box.com/reference/get-files-id-content/
        endpoint: `/2.0/files/${input.id}/content`,
        responseType: 'stream',
        retries: 10
    };
    const chunks: Buffer[] = [];
    const response = await nango.get(proxy);

    for await (const chunk of response.data) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('base64');
}
