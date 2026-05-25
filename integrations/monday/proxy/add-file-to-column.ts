import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['MONDAY_CONNECTION_ID'] || 'monday';
const providerConfigKey = process.env['MONDAY_PROVIDER_CONFIG_KEY'] ?? 'monday';

async function run(input: {
    item_id: string;
    column_id: string;
    file_name: string;
    file_content: string; // base64-encoded file content
    file_type?: string;
}) {
    const { item_id, column_id, file_name, file_content, file_type = 'text/plain' } = input;

    // Monday uses a non-standard multipart format: query/map/0 (not the GraphQL operations spec)
    // https://developer.monday.com/api-reference/reference/files-1
    const query =
        'mutation ($file: File!) { add_file_to_column(item_id: ' +
        item_id +
        ', column_id: "' +
        column_id +
        '", file: $file) { id name url public_url file_extension file_size uploaded_by { id name } url_thumbnail } }';
    const map = JSON.stringify({ '0': 'variables.file' });

    const fileBytes = Buffer.from(file_content, 'base64');
    const blob = new Blob([fileBytes], { type: file_type });

    const formData = new FormData();
    formData.append('query', query);
    formData.append('map', map);
    formData.append('0', blob, file_name);

    const token = await nango.getToken(providerConfigKey, connectionId);

    // https://developer.monday.com/api-reference/reference/files-1
    const response = await fetch('https://api.monday.com/v2/file', {
        method: 'POST',
        headers: {
            Authorization: String(token),
            'api-version': '2026-04'
            // Content-Type is set automatically by fetch when body is FormData
        },
        body: formData
    });

    const responseData: unknown = await response.json();

    if (
        !response.ok ||
        typeof responseData !== 'object' ||
        responseData === null ||
        !('data' in responseData) ||
        typeof responseData.data !== 'object' ||
        responseData.data === null ||
        !('add_file_to_column' in responseData.data) ||
        !responseData.data.add_file_to_column
    ) {
        throw new Error(`Upload failed: ${JSON.stringify(responseData)}`);
    }

    return responseData.data.add_file_to_column;
}

const input = {
    item_id: '2934134049',
    column_id: 'file_mm3ke3ht',
    file_name: 'document.txt',
    file_content: Buffer.from('Hello from Nango!').toString('base64'),
    file_type: 'text/plain'
};

nango.log(await run(input));
