import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    custom_audience_id: z.string().describe('Custom audience ID. Example: "1234567890"'),
    custom_audience_name: z.string().optional().describe('New name for the audience. Length limit: 128 characters.'),
    action: z.enum(['APPEND', 'REMOVE', 'REPLACE']).optional().describe('Modification type for file-based updates. Default: REPLACE.'),
    file_paths: z.array(z.string()).optional().describe('Files to upload to update the Customer File audience.'),
    audience_sub_type: z.enum(['NORMAL', 'REACH_FREQUENCY']).optional().describe('Audience sub type. Only NORMAL to REACH_FREQUENCY is supported.'),
    audience_enhancement: z.boolean().optional().describe('Whether to enable audience enhancement.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    custom_audience_id: z.string(),
    audience_name: z.string().optional(),
    audience_enhancement: z.boolean().optional(),
    audience_sub_type: z.string().optional()
});

const action = createAction({
    description: 'Update a custom audience in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['audiences'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            advertiser_id: input.advertiser_id,
            custom_audience_id: input.custom_audience_id
        };

        if (input.custom_audience_name !== undefined) {
            body['custom_audience_name'] = input.custom_audience_name;
        }

        if (input.action !== undefined) {
            body['action'] = input.action;
        }

        if (input.file_paths !== undefined) {
            body['file_paths'] = input.file_paths;
        }

        if (input.audience_sub_type !== undefined) {
            body['audience_sub_type'] = input.audience_sub_type;
        }

        if (input.audience_enhancement !== undefined) {
            body['audience_enhancement'] = input.audience_enhancement;
        }

        // https://business-api.tiktok.com/portal/docs?id=1739940572667906
        const response = await nango.post({
            endpoint: 'dmp/custom_audience/update/',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const data = providerResponse.data || {};

        return {
            custom_audience_id: input.custom_audience_id,
            ...(typeof data['audience_name'] === 'string' && { audience_name: data['audience_name'] }),
            ...(typeof data['audience_enhancement'] === 'boolean' && { audience_enhancement: data['audience_enhancement'] }),
            ...(typeof data['audience_sub_type'] === 'string' && { audience_sub_type: data['audience_sub_type'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
