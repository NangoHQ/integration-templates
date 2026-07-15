import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    adGroupId: z.string().describe('Ad group ID to add the keyword to. Example: "197714341345"'),
    keywordText: z.string().describe('Keyword text. Example: "nango integration"'),
    keywordMatchType: z.enum(['EXACT', 'PHRASE', 'BROAD']).describe('Keyword match type. Example: "EXACT"'),
    status: z.enum(['ENABLED', 'PAUSED']).describe('Criterion status. Example: "ENABLED"'),
    cpcBidMicros: z.number().optional().describe('Optional CPC bid in micros. Example: 1000000'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResultSchema = z.object({
    resourceName: z.string()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderResultSchema).optional()
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Full resource name of the created criterion.'),
    criterionId: z.string().optional().describe('Numeric criterion ID extracted from the resource name.')
});

const action = createAction({
    description: 'Add a positive keyword criterion to an ad group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutateBody: {
            operations: Array<{
                create: {
                    adGroup: string;
                    status: string;
                    keyword: {
                        text: string;
                        matchType: string;
                    };
                    cpcBidMicros?: number;
                };
            }>;
        } = {
            operations: [
                {
                    create: {
                        adGroup: `customers/${input.customerId}/adGroups/${input.adGroupId}`,
                        status: input.status,
                        keyword: {
                            text: input.keywordText,
                            matchType: input.keywordMatchType
                        },
                        ...(input.cpcBidMicros !== undefined && { cpcBidMicros: input.cpcBidMicros })
                    }
                }
            ]
        };

        // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupCriterionService/MutateAdGroupCriteria
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/adGroupCriteria:mutate`,
            data: mutateBody,
            retries: 1,
            headers: {
                'developer-token': input.developerToken,
                'login-customer-id': '3608201627'
            }
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.results?.[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'Mutate response did not contain a result.',
                response: response.data
            });
        }

        const resourceName = result.resourceName;
        const match = resourceName.match(/~(\d+)$/);
        const criterionId = match ? match[1] : undefined;

        return {
            resourceName,
            ...(criterionId !== undefined && { criterionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
