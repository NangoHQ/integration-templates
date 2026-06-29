import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "36046947"'),
    groupName: z.string().optional().describe('New group name.'),
    permissionProfileId: z.string().optional().describe('Permission profile ID to assign. Example: "52114901"')
});

const ProviderGroupSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    lastModifiedOn: z.string().optional(),
    isManagedByScim: z.boolean().optional(),
    userGroupType: z.string().optional()
});

const ProviderGroupInformationSchema = z.object({
    groups: z.array(ProviderGroupSchema).optional()
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const OutputSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.string().optional(),
    permissionProfileId: z.string().optional(),
    permissionProfileName: z.string().optional(),
    lastModifiedOn: z.string().optional(),
    isManagedByScim: z.boolean().optional(),
    userGroupType: z.string().optional()
});

const action = createAction({
    description: "Update a group's name or permission profile.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: { method: 'POST', path: '/actions/update-group' },
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const requestBody: {
            groups: Array<{
                groupId: string;
                groupName?: string;
                permissionProfileId?: string;
            }>;
        } = {
            groups: [
                {
                    groupId: input.groupId,
                    ...(input.groupName !== undefined && { groupName: input.groupName }),
                    ...(input.permissionProfileId !== undefined && { permissionProfileId: input.permissionProfileId })
                }
            ]
        };

        const response = await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/usergroups/groups/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups`,
            data: requestBody,
            retries: 1
        });

        const providerData = ProviderGroupInformationSchema.parse(response.data);
        const updatedGroup = providerData.groups?.find((g) => g.groupId === input.groupId);

        if (!updatedGroup) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found in response.',
                groupId: input.groupId
            });
        }

        return {
            groupId: updatedGroup.groupId,
            ...(updatedGroup.groupName !== undefined && { groupName: updatedGroup.groupName }),
            ...(updatedGroup.groupType !== undefined && { groupType: updatedGroup.groupType }),
            ...(updatedGroup.permissionProfileId !== undefined && { permissionProfileId: updatedGroup.permissionProfileId }),
            ...(updatedGroup.permissionProfileName !== undefined && { permissionProfileName: updatedGroup.permissionProfileName }),
            ...(updatedGroup.lastModifiedOn !== undefined && { lastModifiedOn: updatedGroup.lastModifiedOn }),
            ...(updatedGroup.isManagedByScim !== undefined && { isManagedByScim: updatedGroup.isManagedByScim }),
            ...(updatedGroup.userGroupType !== undefined && { userGroupType: updatedGroup.userGroupType })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
