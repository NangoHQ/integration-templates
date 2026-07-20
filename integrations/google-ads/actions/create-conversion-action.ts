import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    loginCustomerId: z.string().optional().describe('Manager account ID for API access. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"'),
    name: z.string().describe('Unique conversion action name.'),
    type: z.string().describe('Conversion action type. Example: "WEBPAGE"'),
    category: z.string().describe('Conversion action category. Example: "DEFAULT"'),
    status: z.string().describe('Conversion action status. Example: "ENABLED"'),
    defaultValue: z.number().optional().describe('Default conversion value.')
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Resource name of the created conversion action. Example: "customers/1781900691/conversionActions/7685274465"')
});

const MutateResponseSchema = z.object({
    results: z.array(
        z.object({
            resourceName: z.string()
        })
    )
});

const action = createAction({
    description: 'Create a conversion action for tracking conversions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const headers: Record<string, string> = {
            'developer-token': input.developerToken
        };

        if (input.loginCustomerId !== undefined && input.loginCustomerId !== '') {
            headers['login-customer-id'] = input.loginCustomerId;
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/reference/rpc/v21/ConversionActionService/MutateConversionActions
            endpoint: `/v21/customers/${encodeURIComponent(input.customerId)}/conversionActions:mutate`,
            headers,
            data: {
                operations: [
                    {
                        create: {
                            name: input.name,
                            type: input.type,
                            category: input.category,
                            status: input.status,
                            ...(input.defaultValue !== undefined && {
                                valueSettings: {
                                    defaultValue: input.defaultValue,
                                    alwaysUseDefaultValue: true
                                }
                            })
                        }
                    }
                ]
            },
            retries: 10
        });

        const parsed = MutateResponseSchema.parse(response.data);
        const result = parsed.results[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'Conversion action was not created.'
            });
        }

        return {
            resourceName: result.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
