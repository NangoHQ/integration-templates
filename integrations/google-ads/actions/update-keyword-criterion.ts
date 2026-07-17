import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    resourceName: z.string().describe('Resource name of the ad group criterion. Example: "customers/1781900691/adGroupCriteria/197714341345~2491223357039"'),
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional().describe('Keyword status to update.'),
    cpcBidMicros: z.string().optional().describe('CPC bid in micros to update. Example: "1500000"'),
    finalUrls: z.array(z.string()).optional().describe('Final URLs to update.'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderMutateResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string()
            })
        )
        .optional(),
    partialFailureError: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    resourceName: z.string()
});

const action = createAction({
    description: 'Update mutable fields on an ad group keyword criterion.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateFields: Record<string, unknown> = {
            resourceName: input.resourceName
        };
        const updateMaskFields: string[] = [];

        if (input.status !== undefined) {
            updateFields['status'] = input.status;
            updateMaskFields.push('status');
        }

        if (input.cpcBidMicros !== undefined) {
            updateFields['cpcBidMicros'] = input.cpcBidMicros;
            updateMaskFields.push('cpcBidMicros');
        }

        if (input.finalUrls !== undefined) {
            updateFields['finalUrls'] = input.finalUrls;
            updateMaskFields.push('finalUrls');
        }

        if (updateMaskFields.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided (status, cpcBidMicros, or finalUrls).'
            });
        }

        // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupCriterionService/MutateAdGroupCriteria
        const config: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupCriterionService/MutateAdGroupCriteria
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/adGroupCriteria:mutate`,
            data: {
                operations: [
                    {
                        update: updateFields,
                        updateMask: updateMaskFields.join(',')
                    }
                ]
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
            }
        };
        const response = await nango.post(config);

        const providerResponse = ProviderMutateResponseSchema.parse(response.data);

        if (providerResponse.partialFailureError) {
            throw new nango.ActionError({
                type: 'partial_failure',
                message: 'The mutate operation partially failed.',
                details: providerResponse.partialFailureError
            });
        }

        const firstResult = providerResponse.results?.[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'No result returned from the mutate operation.'
            });
        }

        return {
            resourceName: firstResult.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
