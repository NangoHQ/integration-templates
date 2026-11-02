import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(200).optional().describe('Requested maximum applications in this page.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation from this tool for the same connection and filters; omit for the first page.'),
        filter: z
            .string()
            .min(1)
            .optional()
            .describe(
                'Okta filter expression over id, status, credentials.signing.kid, settings.slo.enabled, or name; omitted means no expression restriction.'
            ),
        prefix: z.string().min(1).optional().describe('Prefix of the application name or display label; omitted means no prefix restriction.'),
        userId: z.string().min(1).optional().describe('Restrict results to applications assigned to this opaque Okta user ID. Cannot be combined with filter.'),
        includeInactive: z.boolean().optional().describe('Include non-active, non-deleted applications as well as active applications.'),
        includeVpnSettings: z.boolean().optional().describe('Include existing VPN notification configuration even when VPN notifications are not configured.')
    })
    .describe('Filters selecting one page of application instances. filter and userId cannot be combined.')
    .meta({ not: { required: ['filter', 'userId'] } });

const ApplicationSchema = z
    .object({
        id: z.string().describe('Opaque application instance ID.'),
        name: z.string().optional().describe('Application definition name, when returned.'),
        label: z.string().describe('User-defined application display name.'),
        status: z.string().optional().describe('Application lifecycle status, when returned.'),
        profile: z.record(z.string(), z.unknown()).optional().describe('Application-specific JSON profile attributes, when returned; not encrypted by Okta.'),
        features: z.array(z.string()).optional().describe('Enabled application feature names, when returned.'),
        settings: z.record(z.string(), z.unknown()).optional().describe('Application-type-specific JSON configuration, when returned.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Application creation instant in UTC, preserving source fractional precision.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Application modification instant in UTC, preserving source fractional precision.'),
        signOnMode: z.string().describe('Okta authentication mode such as SAML_2_0 or OPENID_CONNECT.')
    })
    .describe('Application instance.');

const OutputSchema = z
    .object({
        items: z.array(ApplicationSchema).describe('Application instances in this provider page, in provider order.'),
        nextCursor: z.string().optional().describe('Opaque continuation for another page; omitted when no next link is returned.')
    })
    .describe('One page of application instances in provider order, with an opaque continuation for the next page when one exists.');

const ProviderApplicationSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    label: z.string(),
    status: z.string().optional().nullable(),
    profile: z.record(z.string(), z.unknown()).optional().nullable(),
    features: z.array(z.string()).optional().nullable(),
    settings: z.record(z.string(), z.unknown()).optional().nullable(),
    created: z.string().optional().nullable(),
    lastUpdated: z.string().optional().nullable(),
    signOnMode: z.string()
});

const ProviderApplicationsSchema = z.array(ProviderApplicationSchema);

const RFC3339_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|z|[+-]\d{2}:\d{2})$/;

function toUtcInstant(value: string): string | undefined {
    const match = RFC3339_PATTERN.exec(value);
    if (!match) {
        return undefined;
    }
    const whole = match[1];
    const fraction = match[2];
    const offset = match[3];
    if (whole === undefined || offset === undefined) {
        return undefined;
    }
    const suffix = fraction !== undefined ? fraction : '';
    if (offset === 'Z' || offset === 'z') {
        if (Number.isNaN(new Date(`${whole}Z`).getTime())) {
            return undefined;
        }
        return `${whole}${suffix}Z`;
    }
    const instant = new Date(`${whole}${offset}`);
    if (Number.isNaN(instant.getTime())) {
        return undefined;
    }
    const iso = instant.toISOString();
    return `${iso.slice(0, iso.indexOf('.'))}${suffix}Z`;
}

function extractNextLink(headers: Record<string, unknown>): string | undefined {
    const raw = headers['link'] ?? headers['Link'];
    if (typeof raw !== 'string') {
        return undefined;
    }
    for (const part of raw.split(/,(?=\s*<)/)) {
        const urlMatch = /<([^>]+)>/.exec(part);
        const relMatch = /rel\s*=\s*"([^"]+)"/.exec(part);
        const url = urlMatch !== null ? urlMatch[1] : undefined;
        const rel = relMatch !== null ? relMatch[1] : undefined;
        if (url !== undefined && rel !== undefined && rel.split(/\s+/).includes('next')) {
            return url;
        }
    }
    return undefined;
}

function decodeNextCursor(cursor: string): string {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (URL.canParse(decoded)) {
        const url = new URL(decoded);
        if (url.protocol === 'https:' && url.pathname === '/api/v1/apps') {
            return `${url.pathname}${url.search}`;
        }
    }
    throw new Error('invalid_query: The supplied cursor is not a valid continuation for this tool. Restart without cursor.');
}

function providerErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
        return undefined;
    }
    if ('response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number') {
            return response.status;
        }
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Lists application instances with a single read-only GET request; it never creates, modifies, or deletes provider data.
 * @pitfalls: Filtering by userId returns application instances assigned to that user, not the user's dashboard app links. There is no total count: a full page does not imply another page exists, and an omitted nextCursor is the only end-of-results signal.
 */
const tool = createTool({
    name: 'list-applications',
    description: 'List one page of application instances, optionally restricted by name prefix, supported filter expression, or assigned user.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to discover application IDs for `get-application` and application administration tools. Pass nextCursor back as cursor with the same filters for another page. Use `list-application-users` for assignments within one application. The limit is 1–200, default 50.',
        requiredScopes: ['okta.apps.read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.filter !== undefined && input.userId !== undefined) {
            throw new Error('invalid_query: filter and userId cannot be combined. Remove one of them and retry.');
        }

        let endpoint = '/api/v1/apps';
        let params: Record<string, string | number> | undefined;

        if (input.cursor !== undefined) {
            decodeNextCursor(input.cursor);
        } else {
            params = {
                limit: input.limit ?? 50,
                useOptimization: 'false',
                includeNonDeleted: input.includeInactive === true ? 'true' : 'false',
                alwaysIncludeVpnSettings: input.includeVpnSettings === true ? 'true' : 'false',
                ...(input.prefix !== undefined && { q: input.prefix }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.userId !== undefined && { filter: `user.id eq ${JSON.stringify(input.userId)}`, expand: `user/${input.userId}` })
            };
        }

        // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application/other/listapplications
        // Map provider rejections to the tool's public error codes; every other error propagates unchanged.
        const response = await nango
            .get({
                endpoint,
                ...(params !== undefined && { params }),
                retries: 3
            })
            .catch((error: unknown) => {
                const status = providerErrorStatus(error);
                if (status === 403) {
                    throw new Error(
                        'forbidden: The principal lacks the required application read scope or resource authority. Ask an administrator to grant application read access.'
                    );
                }
                if (status === 429) {
                    throw new Error('rate_limited: Okta rejected the request as Too Many Requests. Wait for the provider retry window and retry this page.');
                }
                if (status === 400) {
                    throw new Error('invalid_query: Okta rejected the supplied filter or continuation. Correct the filter or restart without cursor.');
                }
                throw error;
            });

        const parsed = ProviderApplicationsSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Unexpected response when listing applications: the provider payload did not match the documented shape.');
        }

        const nextLink = extractNextLink(response.headers);

        const items = parsed.data.map((app) => {
            const createdAt = app.created != null ? toUtcInstant(app.created) : undefined;
            const updatedAt = app.lastUpdated != null ? toUtcInstant(app.lastUpdated) : undefined;
            return {
                id: app.id,
                ...(app.name != null && { name: app.name }),
                label: app.label,
                ...(app.status != null && { status: app.status }),
                ...(app.profile != null && { profile: app.profile }),
                ...(app.features != null && { features: app.features }),
                ...(app.settings != null && { settings: app.settings }),
                ...(createdAt !== undefined && { createdAt }),
                ...(updatedAt !== undefined && { updatedAt }),
                signOnMode: app.signOnMode
            };
        });

        return {
            items,
            ...(nextLink !== undefined && { nextCursor: Buffer.from(nextLink, 'utf8').toString('base64url') })
        };
    }
});

export default tool;
