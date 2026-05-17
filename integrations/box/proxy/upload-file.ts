import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['BOX_CONNECTION_ID'] || 'box';
const providerConfigKey = process.env['BOX_PROVIDER_CONFIG_KEY'] ?? 'box';

async function run(input: { name: string; parent_id: string; content: string; content_type?: string }) {
    const { name, parent_id, content, content_type = 'application/octet-stream' } = input;

    const formData = new FormData();
    formData.append('attributes', JSON.stringify({ name, parent: { id: parent_id } }));

    const fileBytes = Buffer.from(content, 'base64');
    const blob = new Blob([fileBytes], { type: content_type });
    formData.append('file', blob, name);

    // https://developer.box.com/reference/post-files-content/
    const response = await nango.post({
        baseUrlOverride: 'https://upload.box.com/api',
        endpoint: '/2.0/files/content',
        providerConfigKey,
        connectionId,
        data: formData,
        retries: 3
    });

    return response.data.entries[0];
}

const input = {
    name: 'example.txt',
    parent_id: '0',
    content: Buffer.from('Hello from Nango!').toString('base64'),
    content_type: 'text/plain'
};

await run(input);
