import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        email: z.email().describe('Optional email filter for the matching site member; omission lists without this filter.').optional(),
        limit: z.number().int().min(1).max(100).describe('Maximum members in this page; defaults to 50.').optional(),
        cursor: z.string().min(1).describe('Opaque continuation for the same site, email filter and limit; omit initially.').optional(),
        siteId: z.string().min(1).describe("Enterprise site's identifier.")
    })
    .describe('Filters and continuation for listing one page of members of an Enterprise site.');

const MemberSchema = z.object({
    id: z.string().describe('Workspace member identifier usable for site access operations.'),
    email: z.string().describe('Member email, if returned.').optional(),
    roles: z
        .object({
            site: z
                .enum(['site_manager', 'designer', 'branch_designer', 'limited_designer', 'marketer', 'content_editor', 'reviewer', 'viewer', 'custom'])
                .describe('Effective site role returned by Webflow; some read roles are not assignable by write operations.'),
            workspace: z.enum(['owner', 'admin', 'member', 'guest', 'reviewer', 'client']).describe('Role in the workspace owning this site.'),
            siteRoleId: z.string().describe('Custom site role identifier when returned for a custom role; otherwise omitted.').optional()
        })
        .describe('Roles held in the owning workspace and this site.'),
    lastName: z.string().describe('Member family name, if returned.').optional(),
    firstName: z.string().describe('Member given name, if returned.').optional()
});

const OutputSchema = z
    .object({
        items: z.array(MemberSchema).describe('Site members in this provider page.'),
        nextCursor: z.string().describe('Continuation token; omitted when Webflow returns a null next cursor.').optional()
    })
    .describe('One page of site members and the opaque continuation token.');

const ProviderResponseSchema = z.object({
    members: z.array(
        z.object({
            id: z.string(),
            email: z.string().optional(),
            roles: z.object({
                site: z.enum(['site_manager', 'designer', 'branch_designer', 'limited_designer', 'marketer', 'content_editor', 'reviewer', 'viewer', 'custom']),
                workspace: z.enum(['owner', 'admin', 'member', 'guest', 'reviewer', 'client']),
                siteRoleId: z.string().optional()
            }),
            lastName: z.string().optional(),
            firstName: z.string().optional()
        })
    ),
    pagination: z.object({
        limit: z.number(),
        nextCursor: z.string().nullable()
    })
});

const CursorTokenSchema = z.object({
    v: z.literal(1),
    siteId: z.string(),
    email: z.string().nullable(),
    limit: z.number().int(),
    providerCursor: z.string()
});

interface CursorScope {
    siteId: string;
    email: string | null;
    limit: number;
}

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ProviderErrorBodySchema = z.object({
    message: z.string().optional(),
    code: z.string().optional()
});

function wrapCursor(scope: CursorScope, providerCursor: string): string {
    const token: z.infer<typeof CursorTokenSchema> = {
        v: 1,
        siteId: scope.siteId,
        email: scope.email,
        limit: scope.limit,
        providerCursor: providerCursor
    };
    return Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');
}

function unwrapCursor(cursor: string, scope: CursorScope): string {
    let decoded: unknown;
    // @allowTryCatch: a malformed cursor token must surface as the public invalid_request error, not a raw JSON parse failure.
    try {
        decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
        throw new Error('invalid_request: cursor is malformed; correct the request or restart without cursor.');
    }
    const parsed = CursorTokenSchema.safeParse(decoded);
    if (!parsed.success) {
        throw new Error('invalid_request: cursor is malformed; correct the request or restart without cursor.');
    }
    if (parsed.data.siteId !== scope.siteId || parsed.data.email !== scope.email || parsed.data.limit !== scope.limit) {
        throw new Error('invalid_request: cursor belongs to a different site, email filter, or limit; restart without cursor.');
    }
    return parsed.data.providerCursor;
}

function toPublicError(error: unknown): Error {
    const httpError = HttpErrorSchema.safeParse(error);
    if (!httpError.success) {
        return error instanceof Error ? error : new Error('provider_error: The request to Webflow failed; retry this read later.');
    }
    const status = httpError.data.response.status;
    const body = ProviderErrorBodySchema.safeParse(httpError.data.response.data);
    const detail = body.success && body.data.message !== undefined ? ` ${body.data.message}` : '';
    if (status === 400) {
        return new Error(
            `invalid_request: Webflow rejected the query values or the cursor for this request; correct the request or restart without cursor.${detail}`
        );
    }
    if (status === 401 || status === 403) {
        return new Error(
            `access_denied: The connection lacks site_access:read or site access, or the workspace does not meet Enterprise requirements; ask a workspace administrator for the required authority and Enterprise eligibility.${detail}`
        );
    }
    if (status === 404) {
        return new Error(`not_found: The site cannot be found; verify siteId.${detail}`);
    }
    if (status === 429) {
        return new Error(`rate_limited: Webflow's token rate limit was reached; wait before requesting the page again.${detail}`);
    }
    return new Error(`provider_error: Webflow reported a server error (status ${status}); retry this read later.${detail}`);
}

/**
 * @tags: [read]
 * @tagReason: Only reads one page of site members from Webflow and changes nothing provider-side.
 * @pitfalls: Requires an Enterprise workspace; sites in other workspaces fail. An email filter with no matching member returns an empty page rather than an error.
 */
const tool = createTool({
    name: 'list-site-members',
    description: 'List one page of members and their site and workspace roles for a site in an Enterprise workspace.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Requires an Enterprise workspace and site-access read authority. Optionally filter by an exact email address. Pass nextCursor back as cursor with the same site, email filter and limit. Use returned IDs with `update-site-member-role` or `remove-site-member`; these also accept email instead.',
        requiredScopes: ['site_access:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const limit = input.limit ?? 50;
        const scope: CursorScope = { siteId: input.siteId, email: input.email ?? null, limit: limit };
        const providerCursor = input.cursor !== undefined ? unwrapCursor(input.cursor, scope) : undefined;

        // https://developers.webflow.com/data/reference/enterprise/site-access/list-members
        const response = await nango
            .get({
                endpoint: `/v2/sites/${encodeURIComponent(input.siteId)}/members`,
                params: {
                    limit: limit,
                    ...(input.email !== undefined && { email: input.email }),
                    ...(providerCursor !== undefined && { cursor: providerCursor })
                },
                retries: 3
            })
            .catch((error: unknown) => {
                throw toPublicError(error);
            });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.members.map((member) => ({
                id: member.id,
                ...(member.email !== undefined && { email: member.email }),
                roles: {
                    site: member.roles.site,
                    workspace: member.roles.workspace,
                    ...(member.roles.siteRoleId !== undefined && { siteRoleId: member.roles.siteRoleId })
                },
                ...(member.lastName !== undefined && { lastName: member.lastName }),
                ...(member.firstName !== undefined && { firstName: member.firstName })
            })),
            ...(parsed.pagination.nextCursor !== null && { nextCursor: wrapCursor(scope, parsed.pagination.nextCursor) })
        };
    }
});

export default tool;
