import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    ruleId: z.string().describe('The unique identifier of the group rule. Example: "0pr14y9xo353ycfX8698"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const ProviderRuleSchema = z.object({
    id: z.string().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Delete a group membership rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/#get-rule
            endpoint: `/api/v1/groups/rules/${encodeURIComponent(input.ruleId)}`,
            retries: 3
        };

        const getResponse = await nango.get(getConfig);
        const providerRule = ProviderRuleSchema.parse(getResponse.data);

        if (providerRule.status === 'ACTIVE') {
            const deactivateConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/groups/#deactivate-rule
                endpoint: `/api/v1/groups/rules/${encodeURIComponent(input.ruleId)}/lifecycle/deactivate`,
                retries: 3
            };

            await nango.post(deactivateConfig);
        }

        const deleteConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/#delete-rule
            endpoint: `/api/v1/groups/rules/${encodeURIComponent(input.ruleId)}`,
            retries: 3
        };

        await nango.delete(deleteConfig);

        return {
            id: input.ruleId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
