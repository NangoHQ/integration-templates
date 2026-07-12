import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    dns_txt_record: z.string().optional(),
    file_content: z.string().optional(),
    filename: z.string().optional(),
    metatag: z.string().optional(),
    verification_code: z.string().optional()
});

const OutputSchema = z.object({
    dns_txt_record: z.string().optional(),
    file_content: z.string().optional(),
    filename: z.string().optional(),
    metatag: z.string().optional(),
    verification_code: z.string().optional()
});

const action = createAction({
    description: 'Get the meta-tag/HTML-file verification code for claiming a website.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/user_account/GET/user_account/websites/verification
            endpoint: '/v5/user_account/websites/verification',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.dns_txt_record !== undefined && { dns_txt_record: providerData.dns_txt_record }),
            ...(providerData.file_content !== undefined && { file_content: providerData.file_content }),
            ...(providerData.filename !== undefined && { filename: providerData.filename }),
            ...(providerData.metatag !== undefined && { metatag: providerData.metatag }),
            ...(providerData.verification_code !== undefined && { verification_code: providerData.verification_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
