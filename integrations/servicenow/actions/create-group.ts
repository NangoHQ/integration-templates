import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Group name. Example: "IT Support"'),
    description: z.string().optional().describe('Group description'),
    active: z.boolean().optional().describe('Whether the group is active'),
    manager: z.string().optional().describe('Sys ID of the manager user'),
    parent: z.string().optional().describe('Sys ID of the parent group'),
    email: z.string().optional().describe('Group email address'),
    group_email: z.string().optional().describe('Group email alias')
});

const ProviderGroupSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    result: ProviderGroupSchema
});

const OutputSchema = ProviderGroupSchema;

const action = createAction({
    description: 'Create a group',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/{tableName}
            endpoint: '/api/now/table/sys_user_group',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.manager !== undefined && { manager: input.manager }),
                ...(input.parent !== undefined && { parent: input.parent }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.group_email !== undefined && { group_email: input.group_email })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
