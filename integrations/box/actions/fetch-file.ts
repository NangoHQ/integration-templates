import type { NangoAction, ProxyConfiguration } from '../../models';
import type { BoxFileIdentifier } from '../types.js';

export async function runAction(nango: NangoAction, input: BoxFileIdentifier) {
    if (!input || !input.fieldId) {
        throw new Error('Missing or invalid input: a file fieldId is required and should be a string');
    }

    const proxy: ProxyConfiguration = {
        // https://developer.box.com/reference/get-files-id-content/
        endpoint: `/2.0/files/${input.fieldId}/content`,
        retries: 10
    };
    const chunks: Buffer[] = [];
    const response = await nango.get(proxy);
    if (response.status === 302 && response.headers['location']) {
        const downloadUrl = response.headers['location'];
        const downloadResponse = await nango.get({ endpoint: downloadUrl, responseType: 'arraybuffer', retries: 10 });
        for await (const chunk of downloadResponse.data) {
            chunks.push(chunk);
        }
    }
    return Buffer.concat(chunks).toString('base64');
}
