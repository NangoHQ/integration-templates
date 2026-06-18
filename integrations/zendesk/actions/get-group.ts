import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.number().describe('Group ID. Example: 123456')
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a group by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.zendesk.com/api-reference/ticketing/groups/groups/#show-group
        const response = await nango.get({
            endpoint: `/api/v2/groups/${encodeURIComponent(input.group_id)}.json`,
            retries: 3
        });

        if (!response.data || !response.data.group) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                group_id: input.group_id
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data.group);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.url !== undefined && { url: providerGroup.url }),
            ...(providerGroup.created_at !== undefined && { created_at: providerGroup.created_at }),
            ...(providerGroup.updated_at !== undefined && { updated_at: providerGroup.updated_at }),
            ...(providerGroup.deleted !== undefined && { deleted: providerGroup.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
