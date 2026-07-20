import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign: z.string().describe('Campaign resource name. Example: "customers/123/campaigns/456"'),
    name: z.string().describe('Ad group name. Example: "My Ad Group"'),
    type: z.string().describe('Ad group type. Example: "SEARCH_STANDARD"'),
    status: z.string().describe('Ad group status. Example: "ENABLED" or "PAUSED"'),
    cpcBidMicros: z.string().describe('CPC bid in micros. Example: "1000000"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string().optional().nullable(),
                adGroup: z
                    .object({
                        resourceName: z.string().optional(),
                        id: z.string().optional(),
                        name: z.string().optional(),
                        status: z.string().optional(),
                        type: z.string().optional(),
                        campaign: z.string().optional(),
                        cpcBidMicros: z.string().optional()
                    })
                    .optional()
                    .nullable()
            })
        )
        .optional(),
    partialFailureError: z
        .object({
            code: z.number().optional(),
            message: z.string().optional(),
            details: z.array(z.unknown()).optional()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    resourceName: z.string(),
    id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    campaign: z.string().optional(),
    cpcBidMicros: z.string().optional()
});

const action = createAction({
    description: 'Create an ad group in an existing Google Ads campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const campaignParts = input.campaign.split('/');
        const customerId = campaignParts[1];
        if (!customerId || campaignParts.length < 4) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid campaign resource name format. Expected "customers/{customerId}/campaigns/{campaignId}".'
            });
        }

        const requestBody = {
            operations: [
                {
                    create: {
                        campaign: input.campaign,
                        name: input.name,
                        type: input.type,
                        status: input.status,
                        cpcBidMicros: input.cpcBidMicros
                    }
                }
            ],
            responseContentType: 'MUTABLE_RESOURCE'
        };

        // https://developers.google.com/google-ads/api/rest/reference/rest/v21/customers/adGroups/mutate
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/adGroups:mutate`,
            data: requestBody,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.partialFailureError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.partialFailureError.message || 'Google Ads API returned a partial failure',
                details: providerResponse.partialFailureError.details
            });
        }

        const result = providerResponse.results?.[0];
        if (!result || !result.resourceName) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No result returned from ad group creation'
            });
        }

        const adGroup = result.adGroup;

        return {
            resourceName: result.resourceName,
            ...(adGroup?.id != null && { id: adGroup.id }),
            ...(adGroup?.name != null && { name: adGroup.name }),
            ...(adGroup?.status != null && { status: adGroup.status }),
            ...(adGroup?.type != null && { type: adGroup.type }),
            ...(adGroup?.campaign != null && { campaign: adGroup.campaign }),
            ...(adGroup?.cpcBidMicros != null && { cpcBidMicros: adGroup.cpcBidMicros })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
