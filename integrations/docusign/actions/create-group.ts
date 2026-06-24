import { z } from 'zod';
import { createAction } from 'nango';

const GroupInputSchema = z.object({
    groupName: z.string().describe('Name of the custom group to create. Example: "Nango Test Group"'),
    groupType: z.string().optional().describe('Type of group. Defaults to "customGroup". System groups cannot be created via API.')
});

const InputSchema = z.object({
    groups: z.array(GroupInputSchema).min(1).describe('One or more custom groups to create.')
});

const ProviderGroupSchema = z.object({
    groupId: z.string().describe('DocuSign group ID. Example: "36046947"'),
    groupName: z.string().describe('Name of the group.'),
    groupType: z.string().describe('Type of the group. Example: "customGroup"')
});

const ProviderResponseSchema = z.object({
    groups: z.array(ProviderGroupSchema).optional()
});

const OutputSchema = z.object({
    groups: z.array(
        z.object({
            groupId: z.string().describe('DocuSign group ID. Example: "36046947"'),
            groupName: z.string().describe('Name of the group.'),
            groupType: z.string().describe('Type of the group. Example: "customGroup"')
        })
    )
});

const action = createAction({
    description: 'Create one or more custom groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['group_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const MetadataSchema = z.object({
            accountId: z.string().optional()
        });

        const parsedMetadata = MetadataSchema.parse(metadata);
        const accountId = parsedMetadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const groupsPayload = input.groups.map((group) => ({
            groupName: group.groupName,
            groupType: group.groupType || 'customGroup'
        }));

        // https://developers.docusign.com/docs/esign-rest-api/reference/groups/groups/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups`,
            data: {
                groups: groupsPayload
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const createdGroups = parsed.groups || [];

        return {
            groups: createdGroups.map((group) => ({
                groupId: group.groupId,
                groupName: group.groupName,
                groupType: group.groupType
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
