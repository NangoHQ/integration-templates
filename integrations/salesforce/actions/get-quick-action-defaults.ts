import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    quickActionName: z.string().describe('The API name of the quick action. Example: "Account.New_Account"'),
    contextId: z
        .string()
        .optional()
        .describe(
            'The ID of the context record to get default values for. If provided, defaults are computed based on this record. Example: "001xx000003DGSXAA4"'
        ),
    apiVersion: z.string().optional().describe('Salesforce API version. Defaults to "v59.0". Example: "v60.0"')
});

const QuickActionDefaultsSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    defaultValues: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve default field values for a quick action',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v59.0';
        const encodedQuickActionName = encodeURIComponent(input.quickActionName);

        let endpoint: string;
        if (input.contextId) {
            const encodedContextId = encodeURIComponent(input.contextId);
            endpoint = `/services/data/${apiVersion}/quickActions/${encodedQuickActionName}/defaultValues/${encodedContextId}`;
        } else {
            endpoint = `/services/data/${apiVersion}/quickActions/${encodedQuickActionName}/defaultValues`;
        }

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_quickActions.htm
        const response = await nango.get({
            endpoint: endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Quick action defaults not found',
                quickActionName: input.quickActionName
            });
        }

        const defaults = QuickActionDefaultsSchema.parse(response.data);

        return {
            ...(Object.keys(defaults).length > 0 && { defaultValues: defaults })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
