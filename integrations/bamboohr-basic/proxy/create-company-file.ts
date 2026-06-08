import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['BAMBOOHR_CONNECTION_ID'] ?? 'bamboohr';
const providerConfigKey = process.env['BAMBOOHR_PROVIDER_CONFIG_KEY'] ?? 'bamboohr';

async function run(input: {
    fileName: string;
    categoryId: number;
    fileContentBase64: string;
    share?: 'yes' | 'no';
    mimeType?: string;
}): Promise<{ id: string; location?: string }> {
    const { fileName, categoryId, fileContentBase64, share, mimeType = 'application/octet-stream' } = input;

    const fileBytes = Buffer.from(fileContentBase64, 'base64');
    const blob = new Blob([fileBytes], { type: mimeType });

    const formData = new FormData();
    formData.append('fileName', fileName);
    formData.append('category', String(categoryId));
    if (share !== undefined) {
        formData.append('share', share);
    }
    formData.append('file', blob, fileName);

    // https://documentation.bamboohr.com/reference/upload-company-file
    const response = await nango.post({
        endpoint: '/v1/files',
        providerConfigKey,
        connectionId,
        data: formData,
        retries: 3
    });

    const locationHeader = response.headers?.['location'] ?? response.headers?.['Location'];
    const location = typeof locationHeader === 'string' ? locationHeader : undefined;

    const pathParts = (location ?? '').split('/');
    const fileId = pathParts[pathParts.length - 1] ?? '';

    return { id: fileId, ...(location !== undefined && { location }) };
}

const input = {
    fileName: 'handbook.pdf',
    categoryId: 1,
    fileContentBase64: Buffer.from('Example file content').toString('base64'),
    mimeType: 'application/pdf'
};

await run(input);
