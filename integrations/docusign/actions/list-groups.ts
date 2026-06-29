import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID. Example: "12345678"')
});

const ProviderGroupSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.enum(['adminGroup', 'everyoneGroup', 'customGroup']).optional(),
    usersCount: z.string().optional()
});

const ProviderGroupsResponseSchema = z.object({
    groups: z.array(ProviderGroupSchema).optional()
});

const GroupSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.enum(['adminGroup', 'everyoneGroup', 'customGroup']).optional(),
    usersCount: z.string().optional()
});

const OutputSchema = z.object({
    groups: z.array(GroupSchema)
});

const action = createAction({
    description: 'List all account groups.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature', 'group_read'],
    endpoint: {
        path: '/actions/list-groups',
        method: 'GET'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }
        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/groups/getgroups/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups`,
            retries: 3
        });

        const parsedResponse = ProviderGroupsResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from DocuSign API.'
            });
        }

        const groups = parsedResponse.data.groups ?? [];

        return {
            groups: groups.map((group) => ({
                groupId: group.groupId,
                ...(group.groupName !== undefined && { groupName: group.groupName }),
                ...(group.groupType !== undefined && { groupType: group.groupType }),
                ...(group.usersCount !== undefined && { usersCount: group.usersCount })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
