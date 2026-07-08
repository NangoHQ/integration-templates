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

const OutputSchema = ProviderGroupSchema;

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

        return ProviderGroupSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
