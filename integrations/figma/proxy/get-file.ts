import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['FIGMA_CONNECTION_ID'] || 'figma';
const providerConfigKey = process.env['FIGMA_PROVIDER_CONFIG_KEY'] ?? 'figma';

// https://www.figma.com/developers/api#get-files-endpoint
async function run(input: { fileKey: string }): Promise<unknown> {
    const response = await nango.get({
        endpoint: `/v1/files/${encodeURIComponent(input.fileKey)}`,
        providerConfigKey,
        connectionId,
        retries: 3
    });

    if (response.status !== 200) {
        throw new Error(`Failed to fetch file: Status Code ${response.status}`);
    }

    return response.data;
}

const input = { fileKey: 'your-file-key' }; // Replace with your actual file key

nango.log(await run(input));
