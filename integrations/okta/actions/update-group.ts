import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "00g14y5q5vaoT7IXb698"'),
    name: z.string().describe('Group name. Must be provided even if unchanged.'),
    description: z.string().optional().describe('Group description.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastMembershipUpdated: z.string().optional(),
    objectClass: z.array(z.string()).optional(),
    type: z.string().optional(),
    profile: z.object({
        name: z.string(),
        description: z.string().nullable().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional()
});

const action = createAction({
    description: 'Update a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let description = input.description;

        if (description === undefined) {
            // Okta's update-group PUT replaces the whole profile object, so an omitted
            // description would otherwise silently wipe out the existing one.
            const currentResponse = await nango.get({
                // https://developer.okta.com/docs/reference/api/groups/#get-group
                endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}`,
                retries: 3
            });
            const currentGroup = ProviderGroupSchema.safeParse(currentResponse.data);
            if (currentGroup.success && currentGroup.data.profile.description != null) {
                description = currentGroup.data.profile.description;
            }
        }

        const response = await nango.put({
            // https://developer.okta.com/docs/reference/api/groups/#update-group
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}`,
            data: {
                profile: {
                    name: input.name,
                    ...(description !== undefined && { description })
                }
            },
            retries: 3
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.profile.name,
            ...(providerGroup.profile.description != null && { description: providerGroup.profile.description }),
            ...(providerGroup.type != null && { type: providerGroup.type }),
            ...(providerGroup.created != null && { created: providerGroup.created }),
            ...(providerGroup.lastUpdated != null && { lastUpdated: providerGroup.lastUpdated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
