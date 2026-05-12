import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    apiVersion: z.string().optional().describe('Salesforce API version. Example: "v60.0". If omitted, uses the default version from the connection.'),
    sObjectType: z
        .string()
        .optional()
        .describe('sObject type to list quick actions for (e.g., "Account", "Contact", "Opportunity"). If omitted, returns global quick actions.')
});

// Raw provider response schema - allows for flexible parsing from Salesforce API
const ProviderQuickActionSchema = z.object({
    name: z.string().optional().default(''),
    label: z.string().optional().default(''),
    type: z.string().optional().default(''),
    targetObject: z.string().optional(),
    targetParentField: z.string().optional()
});

const QuickActionSchema = z.object({
    actionName: z.string().describe('The API name of the quick action'),
    label: z.string().describe('The display label of the quick action'),
    type: z.string().describe('The type of quick action (e.g., "Create", "Update", "SendEmail")'),
    targetObject: z.string().optional().describe('The target sObject for the quick action'),
    targetParentField: z.string().optional().describe('The parent field for the quick action')
});

const OutputSchema = z.object({
    quickActions: z.array(QuickActionSchema).describe('List of quick actions available'),
    count: z.number().describe('Total number of quick actions returned')
});

const action = createAction({
    description: 'List quick actions available in the org or on an sObject',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-quick-actions',
        group: 'Quick Actions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v60.0';

        let endpoint: string;
        if (input.sObjectType) {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_quickactionsforsobject.htm
            endpoint = `/services/data/${encodeURIComponent(apiVersion)}/sobjects/${encodeURIComponent(input.sObjectType)}/quickActions`;
        } else {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_quickactions.htm
            endpoint = `/services/data/${encodeURIComponent(apiVersion)}/quickActions`;
        }

        const response = await nango.get({
            endpoint: endpoint,
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Salesforce API: expected an array of quick actions'
            });
        }

        const quickActions = response.data.map((item: unknown) => {
            const providerAction = ProviderQuickActionSchema.parse(item);
            return {
                actionName: providerAction.name,
                label: providerAction.label,
                type: providerAction.type,
                ...(providerAction.targetObject !== undefined && { targetObject: providerAction.targetObject }),
                ...(providerAction.targetParentField !== undefined && { targetParentField: providerAction.targetParentField })
            };
        });

        return {
            quickActions: quickActions,
            count: quickActions.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
