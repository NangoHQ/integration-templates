import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The customer ID. Example: "1781900691"'),
    loginCustomerId: z.string().optional().describe('The manager account ID (login-customer-id) if accessing via MCC. Example: "3608201627"'),
    adGroupId: z.string().describe('The ad group ID. Example: "197714341345"'),
    name: z.string().optional().describe('The new name for the ad group.'),
    status: z.enum(['UNSPECIFIED', 'UNKNOWN', 'ENABLED', 'PAUSED', 'REMOVED']).optional().describe('The new status.'),
    cpcBidMicros: z.string().optional().describe('The max CPC bid in micros as a string. Example: "1000000"'),
    targetingSetting: z
        .object({
            targetRestrictions: z
                .array(
                    z.object({
                        targetingDimension: z.string().optional(),
                        bidOnly: z.boolean().optional()
                    })
                )
                .optional()
        })
        .optional()
        .describe('Targeting settings to update.'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResponseSchema = z.object({
    results: z.array(
        z.object({
            resourceName: z.string()
        })
    )
});

const OutputSchema = z.object({
    resourceName: z.string()
});

const action = createAction({
    description: 'Update mutable fields on an ad group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const resourceName = `customers/${input.customerId}/adGroups/${input.adGroupId}`;

        const updateBody: Record<string, unknown> = {
            resourceName
        };

        const updateMaskParts: string[] = [];

        if (input.name !== undefined) {
            updateBody['name'] = input.name;
            updateMaskParts.push('name');
        }

        if (input.status !== undefined) {
            updateBody['status'] = input.status;
            updateMaskParts.push('status');
        }

        if (input.cpcBidMicros !== undefined) {
            updateBody['cpcBidMicros'] = input.cpcBidMicros;
            updateMaskParts.push('cpcBidMicros');
        }

        if (input.targetingSetting !== undefined) {
            updateBody['targetingSetting'] = input.targetingSetting;
            updateMaskParts.push('targetingSetting');
        }

        if (updateMaskParts.length === 0) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one field to update must be provided.'
            });
        }

        const headers: Record<string, string> = {
            'developer-token': input.developerToken
        };

        if (input.loginCustomerId !== undefined) {
            headers['login-customer-id'] = input.loginCustomerId;
        }

        // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupService/MutateAdGroups
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/adGroups:mutate`,
            data: {
                operations: [
                    {
                        update: updateBody,
                        updateMask: updateMaskParts.join(',')
                    }
                ]
            },
            headers,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const firstResult = providerResponse.results[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'The API did not return a result for the update operation.'
            });
        }

        return {
            resourceName: firstResult.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
