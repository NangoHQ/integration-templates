import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "00g14y5qi7zRLgyzT698"')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    created: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
    lastMembershipUpdated: z.string().nullable().optional(),
    objectClass: z.array(z.string()).nullable().optional(),
    type: z.string().nullable().optional(),
    profile: z
        .object({
            name: z.string().nullable().optional(),
            description: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    _links: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastMembershipUpdated: z.string().optional(),
    objectClass: z.array(z.string()).optional(),
    type: z.string().optional(),
    profile: z
        .object({
            name: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                groupId: input.groupId
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            ...(providerGroup.created != null && { created: providerGroup.created }),
            ...(providerGroup.lastUpdated != null && { lastUpdated: providerGroup.lastUpdated }),
            ...(providerGroup.lastMembershipUpdated != null && { lastMembershipUpdated: providerGroup.lastMembershipUpdated }),
            ...(providerGroup.objectClass != null && { objectClass: providerGroup.objectClass }),
            ...(providerGroup.type != null && { type: providerGroup.type }),
            ...(providerGroup.profile != null && {
                profile: {
                    ...(providerGroup.profile.name != null && { name: providerGroup.profile.name }),
                    ...(providerGroup.profile.description != null && { description: providerGroup.profile.description })
                }
            }),
            ...(providerGroup._links != null && { _links: providerGroup._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
