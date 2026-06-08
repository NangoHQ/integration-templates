import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['BAMBOOHR_CONNECTION_ID'] ?? 'bamboohr';
const providerConfigKey = process.env['BAMBOOHR_PROVIDER_CONFIG_KEY'] ?? 'bamboohr';

async function run(input: {
    employeeId: string;
    fileName: string;
    categoryId: number;
    fileContent: string;
    share?: 'yes' | 'no';
}): Promise<{ fileUrl: string }> {
    const { employeeId, fileName, categoryId, fileContent, share } = input;

    const fileBytes = Buffer.from(fileContent, 'base64');
    const blob = new Blob([fileBytes], { type: 'application/octet-stream' });

    const formData = new FormData();
    formData.append('category', String(categoryId));
    formData.append('fileName', fileName);
    if (share !== undefined) {
        formData.append('share', share);
    }
    formData.append('file', blob, fileName);

    // https://documentation.bamboohr.com/reference/upload-employee-file
    const response = await nango.post({
        endpoint: `/v1/employees/${encodeURIComponent(employeeId)}/files`,
        providerConfigKey,
        connectionId,
        data: formData,
        retries: 3
    });

    const locationHeader = response.headers?.['location'] ?? response.headers?.['Location'];
    if (typeof locationHeader !== 'string' || locationHeader.length === 0) {
        throw new Error('File uploaded successfully but Location header is missing.');
    }

    return { fileUrl: locationHeader };
}

const input = {
    employeeId: '123',
    fileName: 'document.pdf',
    categoryId: 1,
    fileContent: Buffer.from('Example file content').toString('base64')
};

await run(input);
