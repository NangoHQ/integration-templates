import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    custom_audience_name: z.string().max(128).describe('Audience name. Maximum of 128 characters.'),
    file_paths: z.array(z.string()).describe('List of file paths returned by the upload endpoint.'),
    calculate_type: z.string().describe('Encryption type. Example: "EMAIL_SHA256"'),
    audience_sub_type: z.string().optional().describe('Audience sub type. Enum: NORMAL, REACH_FREQUENCY. Default: NORMAL'),
    audience_enhancement: z.boolean().optional().describe('Whether to enable audience enhancement. Default: false'),
    retention_in_days: z.number().int().min(1).max(365).optional().describe('Number of days to retain the audience. Value range: [1, 365].')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            custom_audience_id: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    custom_audience_id: z.string().describe('The ID of the created custom audience.')
});

const action = createAction({
    description: 'Create a custom audience in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739940570793985
        const response = await nango.post({
            endpoint: 'dmp/custom_audience/create/',
            data: {
                advertiser_id: input.advertiser_id,
                custom_audience_name: input.custom_audience_name,
                file_paths: input.file_paths,
                calculate_type: input.calculate_type,
                ...(input.audience_sub_type !== undefined && { audience_sub_type: input.audience_sub_type }),
                ...(input.audience_enhancement !== undefined && { audience_enhancement: input.audience_enhancement }),
                ...(input.retention_in_days !== undefined && { retention_in_days: input.retention_in_days })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        if (!providerResponse.data?.custom_audience_id) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider response missing custom_audience_id'
            });
        }

        return {
            custom_audience_id: providerResponse.data.custom_audience_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
