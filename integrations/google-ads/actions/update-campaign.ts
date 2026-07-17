import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    campaignId: z.string().describe('Campaign ID to update. Example: "24027360183"'),
    updateMask: z.array(z.string()).describe('Fields to update. Example: ["name", "status"]'),
    name: z.string().optional(),
    status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    campaignBudget: z.string().optional(),
    manualCpc: z
        .object({
            enhancedCpcEnabled: z.boolean().optional()
        })
        .optional(),
    targetCpa: z
        .object({
            targetCpaMicros: z.string().optional()
        })
        .optional(),
    targetRoas: z
        .object({
            targetRoas: z.number().optional()
        })
        .optional(),
    maximizeConversions: z
        .object({
            targetCpaMicros: z.string().optional()
        })
        .optional(),
    maximizeConversionValue: z
        .object({
            targetRoas: z.number().optional()
        })
        .optional(),
    networkSettings: z
        .object({
            targetGoogleSearch: z.boolean().optional(),
            targetSearchNetwork: z.boolean().optional(),
            targetContentNetwork: z.boolean().optional(),
            targetPartnerSearchNetwork: z.boolean().optional()
        })
        .optional(),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID for login-customer-id header. Falls back to connection metadata. Example: "3608201627"'),
    developerToken: z.string().optional().describe('Google Ads developer token. Falls back to connection metadata. Example: "YOUR_DEVELOPER_TOKEN"')
});

const MetadataSchema = z.object({
    loginCustomerId: z.string().describe('Manager account ID for login-customer-id header. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const OutputSchema = z.object({
    resourceName: z.string()
});

const action = createAction({
    description: 'Update mutable campaign settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let loginCustomerId = input.loginCustomerId;
        let developerToken = input.developerToken;

        if (!loginCustomerId || !developerToken) {
            const rawMetadata = await nango.getMetadata();
            const metadata = rawMetadata ? MetadataSchema.parse(rawMetadata) : null;
            loginCustomerId = loginCustomerId ?? metadata?.loginCustomerId;
            developerToken = developerToken ?? metadata?.developerToken;
        }

        if (!loginCustomerId || !developerToken) {
            throw new nango.ActionError({
                type: 'missing_configuration',
                message: 'loginCustomerId and developerToken are required. Set them in connection metadata or pass as input.'
            });
        }

        if (input.updateMask.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'updateMask must contain at least one field path.'
            });
        }

        const biddingSchemeFieldsProvided = [
            input.manualCpc,
            input.targetCpa,
            input.targetRoas,
            input.maximizeConversions,
            input.maximizeConversionValue
        ].filter((field) => field !== undefined).length;
        if (biddingSchemeFieldsProvided > 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of manualCpc, targetCpa, targetRoas, maximizeConversions, or maximizeConversionValue may be set at a time.'
            });
        }

        const resourceName = `customers/${input.customerId}/campaigns/${input.campaignId}`;

        const update: Record<string, unknown> = {
            resourceName
        };

        if (input.name !== undefined) {
            update['name'] = input.name;
        }
        if (input.status !== undefined) {
            update['status'] = input.status;
        }
        if (input.startDate !== undefined) {
            update['startDate'] = input.startDate;
        }
        if (input.endDate !== undefined) {
            update['endDate'] = input.endDate;
        }
        if (input.campaignBudget !== undefined) {
            update['campaignBudget'] = input.campaignBudget;
        }
        if (input.manualCpc !== undefined) {
            update['manualCpc'] = input.manualCpc;
        }
        if (input.targetCpa !== undefined) {
            update['targetCpa'] = input.targetCpa;
        }
        if (input.targetRoas !== undefined) {
            update['targetRoas'] = input.targetRoas;
        }
        if (input.maximizeConversions !== undefined) {
            update['maximizeConversions'] = input.maximizeConversions;
        }
        if (input.maximizeConversionValue !== undefined) {
            update['maximizeConversionValue'] = input.maximizeConversionValue;
        }
        if (input.networkSettings !== undefined) {
            update['networkSettings'] = input.networkSettings;
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaigns:mutate`,
            headers: {
                'developer-token': developerToken,
                'login-customer-id': loginCustomerId
            },
            data: {
                operations: [
                    {
                        updateMask: input.updateMask.join(','),
                        update
                    }
                ]
            },
            retries: 3
        });

        const MutateResponseSchema = z.object({
            results: z
                .array(
                    z.object({
                        resourceName: z.string()
                    })
                )
                .optional()
        });

        const parsed = MutateResponseSchema.parse(response.data);

        const result = parsed.results?.[0];
        if (!result) {
            throw new nango.ActionError({
                type: 'mutate_failed',
                message: 'Campaign update returned no results.'
            });
        }

        return {
            resourceName: result.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
