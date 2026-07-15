import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    developerToken: z.string().optional(),
    loginCustomerId: z.string().optional()
});

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    conversionActionId: z.string().describe('Conversion action ID. Example: "7685274465"'),
    name: z.string().optional().describe('New name for the conversion action'),
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional().describe('Status of the conversion action'),
    valueSettings: z
        .object({
            defaultValue: z.number().optional().describe('Default value for the conversion action'),
            defaultCurrencyCode: z.string().optional().describe('Default currency code'),
            alwaysUseDefaultValue: z.boolean().optional().describe('Whether to always use the default value')
        })
        .optional()
        .describe('Value settings for the conversion action'),
    developerToken: z.string().optional().describe('Google Ads developer token'),
    loginCustomerId: z.string().optional().describe('Manager account ID for access. Example: "3608201627"')
});

const ProviderResponseSchema = z.object({
    results: z.array(
        z.object({
            resourceName: z.string()
        })
    )
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Resource name of the updated conversion action')
});

const action = createAction({
    description: 'Update mutable fields on a conversion action',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let developerToken = input.developerToken;
        let loginCustomerId = input.loginCustomerId;

        if (!developerToken || !loginCustomerId) {
            const rawMetadata = await nango.getMetadata();
            const metadata = MetadataSchema.parse(rawMetadata ?? {});
            developerToken = developerToken ?? metadata.developerToken;
            loginCustomerId = loginCustomerId ?? metadata.loginCustomerId;
        }

        if (!developerToken) {
            throw new nango.ActionError({
                type: 'missing_developer_token',
                message: 'developerToken is required in input or connection metadata.'
            });
        }

        const updateMaskFields: string[] = [];
        const updatePayload: Record<string, unknown> = {
            resourceName: `customers/${input.customerId}/conversionActions/${input.conversionActionId}`
        };

        if (input.name !== undefined) {
            updateMaskFields.push('name');
            updatePayload['name'] = input.name;
        }

        if (input.status !== undefined) {
            updateMaskFields.push('status');
            updatePayload['status'] = input.status;
        }

        if (input.valueSettings !== undefined) {
            const valueSettingsPayload: Record<string, unknown> = {};

            if (input.valueSettings.defaultValue !== undefined) {
                updateMaskFields.push('valueSettings.defaultValue');
                valueSettingsPayload['defaultValue'] = input.valueSettings.defaultValue;
            }

            if (input.valueSettings.defaultCurrencyCode !== undefined) {
                updateMaskFields.push('valueSettings.defaultCurrencyCode');
                valueSettingsPayload['defaultCurrencyCode'] = input.valueSettings.defaultCurrencyCode;
            }

            if (input.valueSettings.alwaysUseDefaultValue !== undefined) {
                updateMaskFields.push('valueSettings.alwaysUseDefaultValue');
                valueSettingsPayload['alwaysUseDefaultValue'] = input.valueSettings.alwaysUseDefaultValue;
            }

            if (Object.keys(valueSettingsPayload).length > 0) {
                updatePayload['valueSettings'] = valueSettingsPayload;
            }
        }

        if (updateMaskFields.length === 0) {
            throw new nango.ActionError({
                type: 'empty_update',
                message: 'At least one field must be provided to update.'
            });
        }

        const headers: Record<string, string> = {
            'developer-token': developerToken
        };

        if (loginCustomerId) {
            headers['login-customer-id'] = loginCustomerId;
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/reference/rpc/v21/ConversionActionService/MutateConversionActions
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/conversionActions:mutate`,
            data: {
                operations: [
                    {
                        updateMask: updateMaskFields.join(','),
                        update: updatePayload
                    }
                ]
            },
            headers,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.results[0]) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'No result returned from the API.'
            });
        }

        return {
            resourceName: providerResponse.results[0].resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
