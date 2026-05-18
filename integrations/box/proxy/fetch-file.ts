import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

async function run(input: { id: string }): Promise<string> {
    const response = await nango.get({
        // https://developer.box.com/reference/get-files-id-content/
        endpoint: `/2.0/files/${input.id}/content`,
        responseType: 'stream',
        retries: 3
        // connectionId: 'your-connection-id'
        // providerConfigKey: 'box'
    });

    const chunks: Buffer[] = [];

    for await (const chunk of response.data) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('base64');
}

const input = { id: 'your-file-id' };

await run(input);
