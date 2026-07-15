import { z } from 'zod';
import { createAction } from 'nango';

const NetworkSettingsSchema = z.object({
    targetGoogleSearch: z.boolean(),
    targetSearchNetwork: z.boolean(),
    targetContentNetwork: z.boolean(),
    targetPartnerSearchNetwork: z.boolean()
});

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    name: z.string().describe('Campaign name.'),
    status: z.enum(['ENABLED', 'PAUSED']).describe('Campaign status.'),
    advertisingChannelType: z
        .enum(['SEARCH', 'DISPLAY', 'SHOPPING', 'HOTEL', 'VIDEO', 'MULTI_CHANNEL', 'LOCAL', 'SMART', 'PERFORMANCE_MAX', 'TRAVEL', 'DEMAND_GEN'])
        .describe('Advertising channel type.'),
    campaignBudget: z.string().describe('Resource name of the existing campaign budget. Example: "customers/123/campaignBudgets/456"'),
    biddingStrategy: z
        .enum([
            'manualCpc',
            'maximizeConversions',
            'maximizeClicks',
            'targetCpa',
            'targetRoas',
            'targetImpressionShare',
            'maximizeConversionValue',
            'percentCpc',
            'pageOnePromoted'
        ])
        .describe('Bidding strategy type.'),
    networkSettings: NetworkSettingsSchema.describe('Network settings.'),
    containsEuPoliticalAdvertising: z
        .enum(['CONTAINS_EU_POLITICAL_ADVERTISING', 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'])
        .describe('EU political advertising flag.'),
    targetCpaMicros: z.string().optional().describe('Average target CPA in micros. Required when biddingStrategy is "targetCpa". Example: "1000000"'),
    targetRoas: z.number().optional().describe('Target return on ad spend. Required when biddingStrategy is "targetRoas". Example: 3.5'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResultSchema = z.object({
    resourceName: z.string()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderResultSchema).optional()
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Resource name of the created campaign.'),
    campaignId: z.string().optional().describe('Campaign ID extracted from the resource name.')
});

const action = createAction({
    description: 'Create a campaign that references an existing budget.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.biddingStrategy === 'targetCpa' && input.targetCpaMicros === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'targetCpaMicros is required when biddingStrategy is "targetCpa".'
            });
        }
        if (input.biddingStrategy === 'targetRoas' && input.targetRoas === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'targetRoas is required when biddingStrategy is "targetRoas".'
            });
        }

        const biddingStrategyBody: Record<string, unknown> = {};
        if (input.biddingStrategy === 'targetCpa') {
            biddingStrategyBody[input.biddingStrategy] = { targetCpaMicros: input.targetCpaMicros };
        } else if (input.biddingStrategy === 'targetRoas') {
            biddingStrategyBody[input.biddingStrategy] = { targetRoas: input.targetRoas };
        } else {
            biddingStrategyBody[input.biddingStrategy] = {};
        }

        // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaigns:mutate`,
            data: {
                operations: [
                    {
                        create: {
                            name: input.name,
                            status: input.status,
                            advertisingChannelType: input.advertisingChannelType,
                            campaignBudget: input.campaignBudget,
                            ...biddingStrategyBody,
                            networkSettings: input.networkSettings,
                            containsEuPoliticalAdvertising: input.containsEuPoliticalAdvertising
                        }
                    }
                ]
            },
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId !== undefined && { 'login-customer-id': input.loginCustomerId })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const results = providerResponse.results;
        if (!results || results.length === 0) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'Campaign creation returned no results.',
                response: response.data
            });
        }

        const result = results[0];
        if (result === undefined) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'Campaign creation returned no results.'
            });
        }

        const campaignId = result.resourceName.split('/').pop();

        return {
            resourceName: result.resourceName,
            ...(campaignId !== undefined && { campaignId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
