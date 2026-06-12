import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe('The call ID returned from the Add New Call request. Example: "7782342274025937895"'),
    mediaContent: z.string().describe('Base64-encoded audio or video file content. Example: "base64-encoded-string..."'),
    fileName: z.string().describe('The name of the media file. Example: "call.mp3"').optional(),
    mediaType: z.string().describe('The MIME type of the media file. Example: "audio/mpeg"').optional()
});

const ProviderResponseSchema = z.object({
    callId: z.string().optional(),
    requestId: z.string().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    callId: z.string().optional(),
    requestId: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Upload audio/video media for a call created via the upload-call action (step 2 of the two-step call ingestion flow).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-call-media',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const token = await nango.getToken();
        const boundary = `----NangoFormBoundary${Date.now()}`;
        const fileName = input.fileName || 'call.mp3';
        const mediaType = input.mediaType || 'audio/mpeg';
        const fileBuffer = Buffer.from(input.mediaContent, 'base64');

        const parts = [
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="mediaFile"; filename="${fileName}"\r\n`),
            Buffer.from(`Content-Type: ${mediaType}\r\n\r\n`),
            fileBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ];
        const body = Buffer.concat(parts);

        const url = new URL(`https://api.gong.io/v2/calls/${encodeURIComponent(input.callId)}/media`);
        const opts: { url: URL; method: 'PUT'; headers: Record<string, string> } = {
            url,
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };
        // @ts-expect-error native fetch accepts Buffer at runtime
        opts.body = body;

        // https://help.gong.io/docs/uploading-calls-from-a-non-integrated-telephony-system
        const response = await nango.uncontrolledFetch(opts);
        const responseData = await response.json();

        if (!response.ok) {
            const errorData = z.object({ requestId: z.string().optional(), errors: z.array(z.string()).optional() }).parse(responseData);
            throw new nango.ActionError({
                type: 'provider_error',
                status: response.status,
                requestId: errorData.requestId,
                errors: errorData.errors
            });
        }

        const providerResponse = ProviderResponseSchema.parse(responseData);
        return {
            ...(providerResponse.callId != null && { callId: providerResponse.callId }),
            ...(providerResponse.requestId != null && { requestId: providerResponse.requestId }),
            ...(providerResponse.url != null && { url: providerResponse.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
