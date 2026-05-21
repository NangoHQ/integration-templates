import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('The unique identifier of the SCIM group to update. Example: "9067729b3d-f987ac4d-a175-44f0-a528-6d23c5d2ec4d"'),
    displayName: z.string().optional().describe('The new display name for the group.'),
    addMembers: z.array(z.string()).optional().describe('Array of user IDs to add as members to the group.'),
    removeMembers: z.array(z.string()).optional().describe('Array of user IDs to remove from the group.')
});

const MemberSchema = z.object({
    value: z.string(),
    display: z.string().optional(),
    $ref: z.string().optional(),
    type: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    schemas: z.array(z.string()).optional(),
    displayName: z.string().optional(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    schemas: z.array(z.string()).optional(),
    displayName: z.string().optional(),
    members: z.array(MemberSchema).optional(),
    meta: MetaSchema.optional()
});

type PatchOperation = {
    op: string;
    path: string;
    value: unknown;
};

const action = createAction({
    description: 'Update a SCIM group in 1Password SCIM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['required.scope'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const operations: PatchOperation[] = [];

        if (input.displayName !== undefined) {
            operations.push({
                op: 'replace',
                path: 'displayName',
                value: input.displayName
            });
        }

        if (input.addMembers !== undefined && input.addMembers.length > 0) {
            operations.push({
                op: 'add',
                path: 'members',
                value: input.addMembers.map((userId) => ({ value: userId }))
            });
        }

        if (input.removeMembers !== undefined && input.removeMembers.length > 0) {
            operations.push({
                op: 'remove',
                path: 'members',
                value: input.removeMembers.map((userId) => ({ value: userId }))
            });
        }

        if (operations.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one update field (displayName, addMembers, or removeMembers) must be provided.'
            });
        }

        const config: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Groups/${encodeURIComponent(input.groupId)}`,
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: operations
            },
            retries: 1
        };

        const response = await nango.patch(config);

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                baseUrlOverride: 'https://provisioning.1password.com/scim',
                endpoint: `/Groups/${encodeURIComponent(input.groupId)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Group not found',
                    groupId: input.groupId
                });
            }
            rawData = getResponse.data;
        }

        const providerGroup = ProviderGroupSchema.parse(rawData);

        return {
            id: providerGroup.id,
            ...(providerGroup.schemas !== undefined && { schemas: providerGroup.schemas }),
            ...(providerGroup.displayName !== undefined && { displayName: providerGroup.displayName }),
            ...(providerGroup.members !== undefined && { members: providerGroup.members }),
            ...(providerGroup.meta !== undefined && { meta: providerGroup.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
