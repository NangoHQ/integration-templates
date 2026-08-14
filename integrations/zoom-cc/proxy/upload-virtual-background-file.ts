import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['ZOOM_CC_CONNECTION_ID'] || 'zoom-cc';
const providerConfigKey = process.env['ZOOM_CC_PROVIDER_CONFIG_KEY'] ?? 'zoom-cc';

async function run(input: { file: string; filename?: string; contentType?: string }): Promise<unknown> {
    const { file, filename = 'upload.jpg', contentType = 'image/jpeg' } = input;

    const fileBytes = Buffer.from(file, 'base64');
    const blob = new Blob([fileBytes], { type: contentType });
    const formData = new FormData();
    formData.append('file', blob, filename);

    // https://developers.zoom.us/docs/api/accounts/#tag/accounts/POST/accounts/{accountId}/settings/virtual_backgrounds
    // Content-Type is set without a boundary so axios computes and appends the correct multipart
    // boundary for the FormData body itself (confirmed live: with a boundary, or without this
    // header at all, Zoom rejects the request as not multipart / missing the 'file' part).
    const response = await nango.post({
        endpoint: '/v2/accounts/me/settings/virtual_backgrounds',
        providerConfigKey,
        connectionId,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        retries: 1
    });

    return response.data;
}

const input = {
    file: Buffer.from('example virtual background image bytes').toString('base64'),
    filename: 'background.jpg',
    contentType: 'image/jpeg'
};

nango.log(await run(input));
