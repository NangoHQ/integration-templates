import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Customer ID. Example: "1781900691"'),
    resourceName: z.string().describe('Ad group ad resource name. Example: "customers/1781900691/adGroupAds/197714341345~816946667438"'),
    updateMask: z.string().describe('Comma-separated list of fields to update. Example: "status" or "ad.finalUrls"'),
    status: z.string().optional().describe('Ad group ad status. Example: "ENABLED" or "PAUSED"'),
    finalUrls: z.array(z.string()).optional().describe('Final URLs for the ad'),
    labels: z.array(z.string()).optional().describe('Label resource names to attach to the ad group ad'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const MutateResultSchema = z.object({
    resourceName: z.string().optional()
});

const MutateResponseSchema = z.object({
    results: z.array(MutateResultSchema).optional()
});

const OutputSchema = z.object({
    resourceName: z.string().optional()
});

const action = createAction({
    description: 'Update mutable fields on an ad group ad',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {
            resourceName: input.resourceName
        };

        if (input.status !== undefined) {
            updateBody['status'] = input.status;
        }

        if (input.finalUrls !== undefined) {
            updateBody['ad'] = {
                finalUrls: input.finalUrls
            };
        }

        if (input.labels !== undefined) {
            updateBody['labels'] = input.labels;
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupAdService/MutateAdGroupAds
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/adGroupAds:mutate`,
            data: {
                operations: [
                    {
                        updateMask: input.updateMask,
                        update: updateBody
                    }
                ]
            },
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
            },
            retries: 3
        });

        const parsed = MutateResponseSchema.parse(response.data);
        const firstResult = parsed.results?.[0];

        return {
            ...(firstResult?.resourceName != null && { resourceName: firstResult.resourceName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
