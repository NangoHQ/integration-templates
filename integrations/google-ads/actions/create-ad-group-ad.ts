import { z } from 'zod';
import { createAction } from 'nango';

const MutateResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string()
            })
        )
        .optional()
});

const InputSchema = z.object({
    customerId: z.string().describe('The Google Ads customer ID. Example: "1781900691"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    adGroupId: z.string().describe('The ad group ID where the ad will be created. Example: "197714341345"'),
    headlines: z.array(z.string()).min(3).describe('At least 3 headlines for the responsive search ad.'),
    descriptions: z.array(z.string()).min(2).describe('At least 2 descriptions for the responsive search ad.'),
    finalUrls: z.array(z.string()).min(1).describe('Final URLs for the ad.'),
    status: z.enum(['ENABLED', 'PAUSED']).optional().describe('Ad status. Defaults to ENABLED.'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const OutputSchema = z.object({
    resourceName: z.string(),
    adGroupAdId: z.string().optional(),
    adId: z.string().optional()
});

const action = createAction({
    description: 'Create an ad inside an ad group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const status = input.status ?? 'ENABLED';

        const requestBody = {
            operations: [
                {
                    create: {
                        adGroup: `customers/${input.customerId}/adGroups/${input.adGroupId}`,
                        status: status,
                        ad: {
                            finalUrls: input.finalUrls,
                            responsiveSearchAd: {
                                headlines: input.headlines.map((text: string) => ({ text })),
                                descriptions: input.descriptions.map((text: string) => ({ text }))
                            }
                        }
                    }
                }
            ]
        };

        // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/adGroupAds:mutate`,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
            },
            data: requestBody,
            retries: 10
        });

        const parsed = MutateResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Google Ads API.',
                details: parsed.error.message
            });
        }

        const results = parsed.data.results ?? [];
        const firstResult = results[0];
        if (firstResult == null) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'Google Ads API returned no results for the mutate operation.'
            });
        }

        const resourceName = firstResult.resourceName;
        const match = resourceName.match(/^customers\/[^/]+\/adGroupAds\/[^~]+~([^/]+)$/);
        const adId = match != null && match[1] != null ? match[1] : undefined;

        return {
            resourceName: resourceName,
            adGroupAdId: adId ? `${input.adGroupId}~${adId}` : undefined,
            adId: adId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
