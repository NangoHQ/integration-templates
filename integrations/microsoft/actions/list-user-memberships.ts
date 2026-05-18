import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z
        .string()
        .describe('The user ID or user principal name to list memberships for. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d" or "user@contoso.com"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filterType: z
        .enum(['group', 'directoryRole', 'administrativeUnit'])
        .optional()
        .describe('Optional filter to return only specific member types: group, directoryRole, or administrativeUnit. Omit to return all types.')
});

const ListOutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            type: z.enum(['group', 'directoryRole', 'administrativeUnit', 'unknown']),
            displayName: z.string().optional(),
            description: z.string().optional(),
            groupDetails: z
                .object({
                    mail: z.string().optional(),
                    mailEnabled: z.boolean().optional(),
                    securityEnabled: z.boolean().optional(),
                    groupTypes: z.array(z.string()).optional(),
                    visibility: z.string().optional(),
                    createdDateTime: z.string().optional()
                })
                .optional(),
            directoryRoleDetails: z
                .object({
                    roleTemplateId: z.string().optional()
                })
                .optional(),
            administrativeUnitDetails: z
                .object({
                    visibility: z.string().optional()
                })
                .optional()
        })
    ),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page. Null if no more pages.')
});

function isValidMembershipResponse(data: unknown): data is { value: unknown[]; '@odata.nextLink'?: string } {
    return data !== null && typeof data === 'object' && 'value' in data && Array.isArray(data.value);
}

function isMembershipItem(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && 'id' in item;
}

type MembershipOutput = z.infer<typeof ListOutputSchema>;

const action = createAction({
    description: 'List all groups, directory roles, and administrative units that a user is a member of in Microsoft.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-user-memberships',
        group: 'Users'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['User.Read.All', 'Directory.Read.All'],

    exec: async (nango, input): Promise<MembershipOutput> => {
        let endpoint = `/v1.0/users/${encodeURIComponent(input.userId)}/memberOf`;

        if (input.filterType) {
            endpoint = `/v1.0/users/${encodeURIComponent(input.userId)}/memberOf/microsoft.graph.${input.filterType}`;
        }

        const params: Record<string, string | number> = {
            $top: 100
        };

        if (input.cursor) {
            params['$skiptoken'] = input.cursor;
        }

        // https://learn.microsoft.com/en-us/graph/api/user-list-memberof
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        if (!isValidMembershipResponse(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API'
            });
        }

        const data = response.data;
        const memberships = data.value;
        const items: MembershipOutput['items'] = [];

        for (const membership of memberships) {
            if (!isMembershipItem(membership)) {
                continue;
            }

            const odataType = String(membership['@odata.type'] || '');
            const id = String(membership['id']);
            const displayName = typeof membership['displayName'] === 'string' ? membership['displayName'] : undefined;
            const description = typeof membership['description'] === 'string' ? membership['description'] : undefined;

            if (odataType.includes('group')) {
                const groupTypesRaw = membership['groupTypes'];
                const groupTypes = Array.isArray(groupTypesRaw) ? groupTypesRaw.filter((gt): gt is string => typeof gt === 'string') : undefined;
                items.push({
                    id,
                    type: 'group',
                    displayName,
                    description,
                    groupDetails: {
                        mail: typeof membership['mail'] === 'string' ? membership['mail'] : undefined,
                        mailEnabled: typeof membership['mailEnabled'] === 'boolean' ? membership['mailEnabled'] : undefined,
                        securityEnabled: typeof membership['securityEnabled'] === 'boolean' ? membership['securityEnabled'] : undefined,
                        groupTypes,
                        visibility: typeof membership['visibility'] === 'string' ? membership['visibility'] : undefined,
                        createdDateTime: typeof membership['createdDateTime'] === 'string' ? membership['createdDateTime'] : undefined
                    }
                });
            } else if (odataType.includes('directoryRole')) {
                items.push({
                    id,
                    type: 'directoryRole',
                    displayName,
                    description,
                    directoryRoleDetails: {
                        roleTemplateId: typeof membership['roleTemplateId'] === 'string' ? membership['roleTemplateId'] : undefined
                    }
                });
            } else if (odataType.includes('administrativeUnit')) {
                items.push({
                    id,
                    type: 'administrativeUnit',
                    displayName,
                    description,
                    administrativeUnitDetails: {
                        visibility: typeof membership['visibility'] === 'string' ? membership['visibility'] : undefined
                    }
                });
            } else {
                items.push({
                    id,
                    type: 'unknown',
                    displayName,
                    description
                });
            }
        }

        let nextCursor: string | undefined;

        if (data['@odata.nextLink'] && typeof data['@odata.nextLink'] === 'string') {
            const nextLink = data['@odata.nextLink'];
            const skipTokenMatch = nextLink.match(/\$skiptoken=([^&]+)/);
            if (skipTokenMatch) {
                nextCursor = skipTokenMatch[1];
            }
        }

        return {
            items,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
