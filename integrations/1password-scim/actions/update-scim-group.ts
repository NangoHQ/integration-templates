import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const MemberOperationSchema = z.object({
    op: z.enum(['add', 'remove']),
    userId: z.string(),
    display: z.string().optional()
});

const InputSchema = z.object({
    groupId: z.string().describe('The SCIM group ID. Example: "27i3xrasou26ukebqazeadyhua"'),
    displayName: z.string().optional().describe('New display name for the group'),
    members: z.array(MemberOperationSchema).optional().describe('Member add or remove operations')
});

const GroupMemberSchema = z.object({
    value: z.string(),
    display: z.string().optional()
});

const GroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    displayName: z.string().optional(),
    members: z.array(GroupMemberSchema).optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    members: z.array(z.object({ value: z.string(), display: z.string().optional() })).optional()
});

const action = createAction({
    description: 'Update a SCIM group in 1Password SCIM',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scim'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const operations: Array<Record<string, unknown>> = [];

        if (input.displayName !== undefined) {
            operations.push({
                op: 'replace',
                path: 'displayName',
                value: input.displayName
            });
        }

        if (input.members !== undefined) {
            for (const member of input.members) {
                operations.push({
                    op: member.op,
                    path: 'members',
                    value: [
                        {
                            value: member.userId,
                            ...(member.display !== undefined && { display: member.display })
                        }
                    ]
                });
            }
        }

        if (operations.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of displayName or members must be provided'
            });
        }

        const config: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Groups/${encodeURIComponent(input.groupId)}`,
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: operations
            },
            retries: 3
        };

        const response = await nango.patch(config);

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
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

        const group = GroupSchema.parse(rawData);

        return {
            id: group.id,
            ...(group.displayName !== undefined && { displayName: group.displayName }),
            ...(group.members !== undefined && {
                members: group.members.map((m) => ({
                    value: m.value,
                    ...(m.display !== undefined && { display: m.display })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
