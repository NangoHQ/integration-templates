import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['ANTHROPIC_CONNECTION_ID'] || 'anthropic';
const providerConfigKey = process.env['ANTHROPIC_PROVIDER_CONFIG_KEY'] ?? 'anthropic';

async function run(input: { filename: string; content: string; mime_type?: string }) {
    const { filename, content, mime_type = 'application/octet-stream' } = input;

    const formData = new FormData();
    const fileBytes = Buffer.from(content, 'base64');
    const blob = new Blob([fileBytes], { type: mime_type });
    formData.append('file', blob, filename);

    // https://docs.anthropic.com/en/api/files-create
    const response = await nango.post({
        endpoint: '/v1/files',
        providerConfigKey,
        connectionId,
        data: formData,
        headers: {
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'files-api-2025-04-14'
        },
        retries: 3
    });

    return response.data;
}

const input = {
    filename: 'example.txt',
    content: Buffer.from('Hello from Nango!').toString('base64'),
    mime_type: 'text/plain'
};

await run(input);
