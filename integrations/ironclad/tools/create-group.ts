import { z } from 'zod';
import { createTool } from 'nango';

const GROUP_SCHEMA_URN = 'urn:ietf:params:scim:schemas:core:2.0:Group';

const InputSchema = z
    .object({
        displayName: z.string().min(1).describe('Name of the new group, preserving Unicode.'),
        memberUserIds: z
            .array(z.string().min(1).describe('User ID of an initial group member.'))
            .max(100)
            .describe('Initial member user IDs. Omission creates without explicit members; [] explicitly requests none. Public cap 100 is provisional.')
            .meta({ uniqueItems: true })
            .optional()
    })
    .describe('Input for creating a SCIM group.');

const OutputSchema = z
    .object({
        id: z.string().describe('Created SCIM group ID.'),
        url: z.url().describe('SCIM resource URL; omitted when absent.').optional(),
        externalId: z.string().describe('Identity-provider identifier; omitted when absent.').optional(),
        displayName: z.string().describe('Stored group name; omitted if not returned.').optional(),
        memberUserIds: z
            .array(z.string().describe('Stored user ID of a group member.'))
            .describe('Stored member user IDs; omitted when not returned, preserving [].')
            .optional()
    })
    .describe('The created SCIM group.');

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()).nullish(),
    id: z.string(),
    displayName: z.string().nullish(),
    externalId: z.string().nullish(),
    members: z
        .array(
            z.object({
                type: z.string().nullish(),
                value: z.string().nullish()
            })
        )
        .nullish(),
    meta: z
        .object({
            resourceType: z.string().nullish(),
            location: z.string().nullish()
        })
        .nullish()
});

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ScimErrorSchema = z.object({
    detail: z.string().optional()
});

function toPublicError(error: unknown): Error | undefined {
    const proxyError = ProxyErrorSchema.safeParse(error);
    if (!proxyError.success) {
        return undefined;
    }
    const { status, data } = proxyError.data.response;
    const scimError = ScimErrorSchema.safeParse(data);
    const detail = scimError.success && scimError.data.detail ? ` Detail: ${scimError.data.detail}` : '';
    switch (status) {
        case 400:
            return new Error(
                `invalid_request: Ironclad rejected the group data or a member user ID.${detail} Correct the group name or use existing accessible user IDs.`
            );
        case 403:
            return new Error(`permission_denied: SCIM provisioning access is missing.${detail} Ask an administrator for SCIM group creation authority.`);
        case 409:
            return new Error(
                `conflict: Ironclad reported a group creation conflict.${detail} Check list-groups for an existing group before choosing a different name or retrying.`
            );
        case 500:
            return new Error(
                `provider_error: Ironclad reported an internal server error.${detail} Check list-groups before retrying, because creation may have occurred.`
            );
        default:
            return undefined;
    }
}

/**
 * @tags: [write]
 * @tagReason: Creates a new SCIM group in Ironclad, a provider-side mutation with no reads.
 * @pitfalls: Creation has no idempotent replay: creating a group that already exists fails with conflict, and after a provider_error the group may still have been created, so check list-groups before retrying to avoid a duplicate.
 */
const tool = createTool({
    name: 'create-group',
    description: 'Create a SCIM group, optionally with initial user members. Requires SCIM provisioning authority.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use to create a new group. Obtain existing user IDs from your Ironclad user directory; use `list-groups` first to avoid unintentionally creating a duplicate. To change an existing group, use `update-group` or the member association tools. Up to 100 initial members.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response;
        // @allowTryCatch: provider HTTP statuses are mapped to the tool's public error codes; unmapped failures are rethrown unchanged.
        try {
            response = await nango.post({
                // https://developer.ironcladapp.com/openapi/ironclad-scim-api.json#POST%20/Groups
                endpoint: '/scim/v2/Groups',
                data: {
                    schemas: [GROUP_SCHEMA_URN],
                    displayName: input.displayName,
                    ...(input.memberUserIds !== undefined && { members: input.memberUserIds.map((memberUserId) => ({ value: memberUserId })) })
                },
                retries: 3
            });
        } catch (error) {
            const publicError = toPublicError(error);
            if (publicError) {
                throw publicError;
            }
            throw error;
        }

        const parsedGroup = ProviderGroupSchema.safeParse(response.data);
        if (!parsedGroup.success) {
            throw new Error(
                'write_result_unknown: Ironclad returned a create-group response that could not be mapped; the group may have been created. Look for it with list-groups before creating again.'
            );
        }

        const group = parsedGroup.data;
        return {
            id: group.id,
            ...(group.meta?.location != null && { url: group.meta.location }),
            ...(group.externalId != null && { externalId: group.externalId }),
            ...(group.displayName != null && { displayName: group.displayName }),
            ...(group.members != null && { memberUserIds: group.members.map((member) => member.value).filter((value): value is string => value != null) })
        };
    }
});

export default tool;
