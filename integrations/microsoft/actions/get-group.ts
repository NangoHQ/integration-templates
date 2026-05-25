import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier for the group. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string().nullable().optional(),
    groupTypes: z.array(z.string()).optional(),
    mail: z.string().nullable().optional(),
    mailEnabled: z.boolean().optional(),
    mailNickname: z.string().nullable().optional(),
    securityEnabled: z.boolean().optional(),
    visibility: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    renewedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string().optional(),
    groupTypes: z.array(z.string()).optional(),
    mail: z.string().optional(),
    mailEnabled: z.boolean().optional(),
    mailNickname: z.string().optional(),
    securityEnabled: z.boolean().optional(),
    visibility: z.string().optional(),
    createdDateTime: z.string().optional(),
    renewedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single group from Microsoft.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/group-get
            endpoint: `/v1.0/groups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            displayName: providerGroup.displayName,
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.groupTypes !== undefined && { groupTypes: providerGroup.groupTypes }),
            ...(providerGroup.mail != null && { mail: providerGroup.mail }),
            ...(providerGroup.mailEnabled !== undefined && { mailEnabled: providerGroup.mailEnabled }),
            ...(providerGroup.mailNickname != null && { mailNickname: providerGroup.mailNickname }),
            ...(providerGroup.securityEnabled !== undefined && { securityEnabled: providerGroup.securityEnabled }),
            ...(providerGroup.visibility != null && { visibility: providerGroup.visibility }),
            ...(providerGroup.createdDateTime != null && { createdDateTime: providerGroup.createdDateTime }),
            ...(providerGroup.renewedDateTime != null && { renewedDateTime: providerGroup.renewedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
