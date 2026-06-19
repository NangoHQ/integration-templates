import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok advertiser ID. Example: "7644143197428744199"'),
    image_url: z.string().url().describe('Public URL of the image to upload. Example: "https://example.com/image.png"'),
    file_name: z.string().optional().describe('Name for the uploaded image. Example: "creative-image.png"')
});

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const ProviderDataSchema = z
    .object({
        image_id: z.string(),
        image_url: z.string().optional(),
        file_name: z.string().optional(),
        material_id: z.string().optional(),
        format: z.string().optional(),
        height: z.number().optional(),
        width: z.number().optional(),
        signature: z.string().optional(),
        size: z.number().optional(),
        create_time: z.string().nullable().optional(),
        modify_time: z.string().nullable().optional(),
        displayable: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    image_id: z.string(),
    image_url: z.string().optional(),
    file_name: z.string().optional(),
    material_id: z.string().optional(),
    format: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    signature: z.string().optional(),
    size: z.number().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    displayable: z.boolean().optional()
});

const action = createAction({
    description: 'Upload an image creative to TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Use a fixed boundary so that recorded test mocks remain stable across executions.
        const boundary = '----NangoBoundaryFixed12345';
        let body =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="advertiser_id"\r\n\r\n` +
            `${input.advertiser_id}\r\n` +
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="upload_type"\r\n\r\n` +
            `UPLOAD_BY_URL\r\n` +
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="image_url"\r\n\r\n` +
            `${input.image_url}\r\n`;

        if (input.file_name !== undefined) {
            body += `--${boundary}\r\n` + `Content-Disposition: form-data; name="file_name"\r\n\r\n` + `${input.file_name}\r\n`;
        }

        body += `--${boundary}--\r\n`;

        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs/api-reference?id=1739067433456642
            endpoint: '/file/image/ad/upload/',
            data: body,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            retries: 1
        };

        const response = await nango.post(config);

        const envelope = ProviderEnvelopeSchema.parse(response.data);

        if (envelope.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message || `TikTok API returned error code ${envelope.code}`,
                code: envelope.code,
                request_id: envelope.request_id
            });
        }

        if (!envelope.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in TikTok API response'
            });
        }

        const providerData = ProviderDataSchema.parse(envelope.data);

        return {
            image_id: providerData.image_id,
            ...(providerData.image_url != null && { image_url: providerData.image_url }),
            ...(providerData.file_name != null && { file_name: providerData.file_name }),
            ...(providerData.material_id != null && { material_id: providerData.material_id }),
            ...(providerData.format != null && { format: providerData.format }),
            ...(providerData.height != null && { height: providerData.height }),
            ...(providerData.width != null && { width: providerData.width }),
            ...(providerData.signature != null && { signature: providerData.signature }),
            ...(providerData.size != null && { size: providerData.size }),
            ...(providerData.create_time != null && { create_time: providerData.create_time }),
            ...(providerData.modify_time != null && { modify_time: providerData.modify_time }),
            ...(providerData.displayable != null && { displayable: providerData.displayable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
