import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['GONG_CONNECTION_ID'] || 'gong-oauth';
const providerConfigKey = process.env['GONG_PROVIDER_CONFIG_KEY'] ?? 'gong-oauth';

async function run(input: {
    callId: string;
    mediaContent: string; // base64-encoded audio or video file
    fileName?: string;
    mediaType?: string;
}) {
    const { callId, mediaContent, fileName = 'call.mp3', mediaType = 'audio/mpeg' } = input;

    const fileBytes = Buffer.from(mediaContent, 'base64');
    const blob = new Blob([fileBytes], { type: mediaType });

    const formData = new FormData();
    formData.append('mediaFile', blob, fileName);

    const token = await nango.getToken(providerConfigKey, connectionId);

    // https://help.gong.io/docs/uploading-calls-from-a-non-integrated-telephony-system
    const response = await fetch(`https://api.gong.io/v2/calls/${encodeURIComponent(callId)}/media`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${String(token)}`
            // Content-Type is set automatically by fetch when body is FormData
        },
        body: formData
    });

    const responseData: unknown = await response.json();

    if (!response.ok) {
        throw new Error(`Upload failed (${response.status}): ${JSON.stringify(responseData)}`);
    }

    return responseData;
}

const input = {
    callId: '7782342274025937895',
    mediaContent: Buffer.from('sample audio').toString('base64'),
    fileName: 'call.mp3',
    mediaType: 'audio/mpeg'
};

nango.log(await run(input));
