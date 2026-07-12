import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Group name. Example: "Engineering"'),
    description: z.string().optional().describe('Group description. Example: "Engineering team members"')
});

const ProviderGroupSchema = z
    .object({
        id: z.string(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        type: z.string().optional(),
        profile: z.object({
            name: z.string(),
            description: z.string().nullable().optional()
        })
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Create a group.',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/groups/#add-group
            endpoint: '/api/v1/groups',
            data: {
                profile: {
                    name: input.name,
                    ...(input.description !== undefined && { description: input.description })
                }
            },
            retries: 3
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.profile.name,
            ...(providerGroup.profile.description != null && { description: providerGroup.profile.description }),
            ...(providerGroup.created !== undefined && { created: providerGroup.created }),
            ...(providerGroup.lastUpdated !== undefined && { lastUpdated: providerGroup.lastUpdated }),
            ...(providerGroup.type !== undefined && { type: providerGroup.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
