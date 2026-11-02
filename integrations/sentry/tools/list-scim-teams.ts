import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        organizationId: z.string().min(1).describe('Organization ID or slug.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum teams in this page.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation from this tool, scoped to organization, filter, and membership selection.'),
        displayName: z.string().min(1).optional().describe('Optional exact team slug to match; implementation constructs the SCIM equality filter.'),
        includeMembers: z.boolean().optional().describe('Whether to include the available membership array, limited by Sentry to 10,000 entries per team.')
    })
    .describe('Filters and pagination for listing one page of SCIM teams in an organization.');

const TeamSchema = z.object({
    id: z.string().describe('Opaque SCIM team ID.'),
    displayName: z.string().describe('Team slug displayed in Sentry.'),
    members: z
        .array(
            z.object({
                memberId: z.string().describe('Organization member ID from the SCIM value field.'),
                display: z.string().describe('Provider member display value, usually an email address.')
            })
        )
        .max(10000)
        .optional()
        .describe('Available members, not guaranteed complete at 10,000 entries; omitted when excluded or absent upstream.')
});

const OutputSchema = z
    .object({
        items: z.array(TeamSchema).describe('Teams in this page, in provider order.'),
        total: z.number().int().describe('Provider-reported total matching teams at request time.'),
        nextCursor: z.string().optional().describe('Continuation for the next page; omitted when exhausted.')
    })
    .describe('One page of matching SCIM teams plus the provider-reported total and an optional continuation cursor.');

const ScimMemberSchema = z.object({
    value: z.string(),
    display: z.string()
});

const ScimGroupSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    members: z.array(ScimMemberSchema).optional()
});

const ScimListResponseSchema = z.object({
    totalResults: z.number().int(),
    Resources: z.array(ScimGroupSchema).optional()
});

const CursorSchema = z.object({
    v: z.literal(1),
    organizationId: z.string(),
    displayName: z.string().nullable(),
    includeMembers: z.boolean(),
    nextIndex: z.number().int().positive()
});

const ErrorEnvelopeSchema = z.object({
    response: z.object({
        status: z.number().int()
    })
});

function errorStatus(error: unknown): number | undefined {
    const parsed = ErrorEnvelopeSchema.safeParse(error);
    return parsed.success ? parsed.data.response.status : undefined;
}

function escapeScimString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function encodeCursor(payload: z.infer<typeof CursorSchema>): string {
    return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor(raw: string): z.infer<typeof CursorSchema> {
    let parsed: unknown;
    // @allowTryCatch: a malformed cursor must surface as the public invalid_cursor error instead of a raw URI/JSON parse failure.
    try {
        parsed = JSON.parse(decodeURIComponent(raw));
    } catch (_error) {
        throw new Error('invalid_cursor: Cursor is invalid. Restart without cursor using the desired filters.');
    }
    const result = CursorSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error('invalid_cursor: Cursor is invalid. Restart without cursor using the desired filters.');
    }
    return result.data;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only SCIM Groups GET request; it never mutates the provider.
 * @pitfalls: Membership arrays are capped by Sentry at 10,000 members per team and are not a complete roster at that boundary; an omitted members field means excluded or unavailable, not empty. Pages are not a stable snapshot across calls. The organization must have SCIM access enabled and the token a team scope, or the call fails with permission_denied.
 */
const tool = createTool({
    name: 'list-scim-teams',
    description: "List one page of an organization's teams as exposed through SCIM, including available membership information.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use for provisioning-directory lookups; use `get-scim-team` for a known team. Pass nextCursor back as cursor with the same organization and filters. Each call returns at most 100 teams. Membership arrays contain at most 10,000 members and must not be treated as a complete roster at that boundary.',
        requiredScopes: ['team:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const limit = input.limit ?? 100;
        const includeMembers = input.includeMembers ?? true;

        let startIndex = 1;
        if (input.cursor !== undefined) {
            const cursor = decodeCursor(input.cursor);
            if (
                cursor.organizationId !== input.organizationId ||
                cursor.displayName !== (input.displayName ?? null) ||
                cursor.includeMembers !== includeMembers
            ) {
                throw new Error(
                    'invalid_cursor: Cursor belongs to a different organization, filter, or membership selection. Restart without cursor using the desired filters.'
                );
            }
            startIndex = cursor.nextIndex;
        }

        let data: z.infer<typeof ScimListResponseSchema>;
        // @allowTryCatch: provider HTTP failures must be remapped to the public error codes (permission_denied, not_found, invalid_request); a tool has no Nango error class.
        try {
            // https://docs.sentry.io/api/scim/list-an-organizations-paginated-teams/
            const response = await nango.get({
                endpoint: `/api/0/organizations/${encodeURIComponent(input.organizationId)}/scim/v2/Groups`,
                params: {
                    startIndex,
                    count: limit,
                    ...(input.displayName !== undefined && { filter: `displayName eq "${escapeScimString(input.displayName)}"` }),
                    ...(includeMembers ? {} : { excludedAttributes: 'members' })
                },
                retries: 3
            });
            data = ScimListResponseSchema.parse(response.data);
        } catch (error) {
            const status = errorStatus(error);
            if (status === 401 || status === 403) {
                throw new Error(
                    'permission_denied: Sentry refused authorization or organization access, including SCIM access. Ask an organization administrator to grant SCIM access and a team:read, team:write, or team:admin permission.'
                );
            }
            if (status === 404) {
                throw new Error('not_found: Organization is unavailable. Correct organizationId or ask for access.');
            }
            if (status === 400) {
                throw new Error('invalid_request: Sentry rejected the equality filter. Check displayName or retry without the filter.');
            }
            throw error;
        }

        const resources = data.Resources ?? [];
        const teams = resources.map((group) => ({
            id: group.id,
            displayName: group.displayName,
            ...(group.members !== undefined && {
                members: group.members.map((member) => ({
                    memberId: member.value,
                    display: member.display
                }))
            })
        }));

        const nextIndex = startIndex + resources.length;
        const hasMore = resources.length > 0 && nextIndex <= data.totalResults;

        return {
            items: teams,
            total: data.totalResults,
            ...(hasMore && {
                nextCursor: encodeCursor({
                    v: 1,
                    organizationId: input.organizationId,
                    displayName: input.displayName ?? null,
                    includeMembers,
                    nextIndex: startIndex
                })
            })
        };
    }
});

export default tool;
