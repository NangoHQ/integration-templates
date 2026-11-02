import { z } from 'zod';
import { createTool } from 'nango';

const GROUP_SCHEMA_URN = 'urn:ietf:params:scim:schemas:core:2.0:Group';

const InputSchema = z
    .object({
        groupId: z.string().min(1).describe('Internal SCIM group ID to update.'),
        displayName: z.string().min(1).optional().describe('New group name; omission preserves the current name.'),
        memberUserIds: z
            .array(z.string().min(1).describe('Internal SCIM user ID to include in the replacement membership.'))
            .max(100)
            .refine((userIds) => new Set(userIds).size === userIds.length, { message: 'memberUserIds must not contain duplicate user IDs.' })
            .optional()
            .describe('Complete replacement user membership; [] clears membership and omission preserves it. Public cap 100 is provisional.')
            .meta({ uniqueItems: true })
    })
    .refine((input) => input.displayName !== undefined || input.memberUserIds !== undefined, {
        message: 'Supply displayName, memberUserIds, or both; groupId alone changes nothing.'
    })
    .describe('Partial update of a SCIM group: groupId is required and at least one of displayName or memberUserIds must be supplied.')
    .meta({ minProperties: 2 });

const OutputSchema = z
    .object({
        id: z.string().describe("Updated group's unchanged internal ID."),
        url: z.url().optional().describe('SCIM resource URL; omitted if absent.'),
        externalId: z.string().optional().describe('Identity-provider identifier; omitted if absent.'),
        displayName: z.string().optional().describe('Stored group name; omitted if not returned.'),
        memberUserIds: z
            .array(z.string().describe('Internal SCIM user ID of a stored member.'))
            .optional()
            .describe('Stored membership; [] is explicitly empty, omission means not returned.')
    })
    .describe('The SCIM group as stored by Ironclad after the replacement.');

const ProviderGroupMemberSchema = z.object({
    type: z.string().optional(),
    value: z.string().optional()
});

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    members: z.array(ProviderGroupMemberSchema).optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            location: z.string().optional()
        })
        .optional()
});

function httpStatusOf(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number') {
            return response.status;
        }
    }
    return undefined;
}

function memberValues(members: z.infer<typeof ProviderGroupMemberSchema>[]): string[] {
    return members.flatMap((member) => (member.value !== undefined ? [member.value] : []));
}

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the current group to preserve omitted fields, then replaces the group's writable representation; replacing membership can remove existing members, which is difficult to reverse.
 * @pitfalls: Updates are full replacements with no atomicity, so a concurrent group change between the internal read and the replace is silently overwritten. A write_result_unknown error means the change may still have been applied; verify with get-group before retrying.
 */
const tool = createTool({
    name: 'update-group',
    description: "Partially update a SCIM group's name or replace its complete member set, preserving omitted fields. Requires SCIM provisioning authority.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Find groupId with `list-groups`. Supplying memberUserIds replaces the whole membership, and [] removes all members. Omission preserves membership. For adding or removing selected members without replacing the set, use `add-member-to-group`, `remove-member-from-group`, or their batch variants. Up to 100 replacement members.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.displayName === undefined && input.memberUserIds === undefined) {
            throw new Error('invalid_request: Supply displayName, memberUserIds, or both; groupId alone changes nothing.');
        }

        const groupPath = `/scim/v2/Groups/${input.groupId}`;

        let displayName: string;
        let memberUserIds: string[];

        if (input.displayName !== undefined && input.memberUserIds !== undefined) {
            displayName = input.displayName;
            memberUserIds = input.memberUserIds;
        } else {
            let currentGroupData: unknown;
            // @allowTryCatch: provider HTTP statuses are mapped to the tool's public error codes.
            try {
                // https://developer.ironcladapp.com/openapi/ironclad-scim-api.json#GET%20/Groups/{groupId}
                const getResponse = await nango.get({
                    endpoint: groupPath,
                    retries: 3
                });
                currentGroupData = getResponse.data;
            } catch (error) {
                const status = httpStatusOf(error);
                if (status === 404) {
                    throw new Error(`not_found: Group '${input.groupId}' was not found or is unavailable. Find a current ID with list-groups.`);
                }
                if (status === 403) {
                    throw new Error('permission_denied: SCIM group read authority is missing. Ask an administrator for SCIM group read and update authority.');
                }
                if (status !== undefined && status >= 500) {
                    throw new Error(
                        'provider_error: Ironclad reported an internal server error while reading the group. Inspect get-group before retrying to avoid overwriting newer changes.'
                    );
                }
                throw error;
            }

            const parsed = ProviderGroupSchema.safeParse(currentGroupData);
            if (!parsed.success) {
                throw new Error(
                    'provider_error: Ironclad returned a group representation that could not be parsed, so omitted fields cannot be preserved safely. Inspect get-group before retrying.'
                );
            }
            const current = parsed.data;

            if (input.displayName !== undefined) {
                displayName = input.displayName;
            } else {
                if (current.displayName === undefined) {
                    throw new Error(
                        'provider_error: Ironclad did not return the current group name, so it cannot be preserved. Supply displayName explicitly.'
                    );
                }
                displayName = current.displayName;
            }

            if (input.memberUserIds !== undefined) {
                memberUserIds = input.memberUserIds;
            } else {
                if (current.members === undefined) {
                    throw new Error(
                        'provider_error: Ironclad did not return the current group membership, so it cannot be preserved. Supply memberUserIds explicitly.'
                    );
                }
                memberUserIds = memberValues(current.members);
            }
        }

        let putResponseData: unknown;
        // @allowTryCatch: provider HTTP statuses are mapped to the tool's public error codes.
        try {
            // https://developer.ironcladapp.com/openapi/ironclad-scim-api.json#PUT%20/Groups/{groupId}
            const putResponse = await nango.put({
                endpoint: groupPath,
                data: {
                    schemas: [GROUP_SCHEMA_URN],
                    displayName: displayName,
                    members: memberUserIds.map((userId) => ({ value: userId }))
                },
                // Replaying this replacement after a lost response could overwrite a concurrent change, so it is not retried.
                retries: 0
            });
            putResponseData = putResponse.data;
        } catch (error) {
            const status = httpStatusOf(error);
            if (status === 400) {
                throw new Error(
                    'invalid_request: Ironclad rejected the group name or replacement user membership. Correct the name or use valid accessible user IDs.'
                );
            }
            if (status === 403) {
                throw new Error('permission_denied: SCIM group update authority is missing. Ask an administrator for SCIM group read and update authority.');
            }
            if (status === 404) {
                throw new Error(`not_found: Group '${input.groupId}' was not found or is unavailable. Find a current ID with list-groups.`);
            }
            if (status !== undefined && status >= 500) {
                throw new Error(
                    'provider_error: Ironclad reported an internal server error while replacing the group. Inspect get-group before retrying to avoid overwriting newer changes.'
                );
            }
            throw error;
        }

        const updated = ProviderGroupSchema.safeParse(putResponseData);
        if (!updated.success) {
            throw new Error(
                'write_result_unknown: The replacement may have succeeded but its response could not be mapped. Inspect get-group and compare its membership and name before another update.'
            );
        }
        const group = updated.data;

        return {
            id: group.id,
            ...(group.meta?.location !== undefined && { url: group.meta.location }),
            ...(group.externalId !== undefined && { externalId: group.externalId }),
            ...(group.displayName !== undefined && { displayName: group.displayName }),
            ...(group.members !== undefined && { memberUserIds: memberValues(group.members) })
        };
    }
});

export default tool;
