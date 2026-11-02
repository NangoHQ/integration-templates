import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createTool } from 'nango';

const DEFAULT_LIMIT = 10;

const InputSchema = z
    .object({
        email: z.email().optional().describe('Exact customer email filter; may match multiple accounts.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum customer records per page; default 10.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation for these filters and connection.'),
        company: z.string().optional().describe('Exact company-name filter.'),
        includeDeleted: z.boolean().optional().describe('Include provider-marked deleted customers; default false.')
    })
    .describe('Filters and continuation token for one page of customers.');

const CustomerSchema = z.object({
    id: z.string().describe('Opaque customer ID in the connected site.'),
    email: z.string().optional().describe('Customer notification email if set.'),
    company: z.string().optional().describe('Company name if set.'),
    deleted: z.boolean().describe('Provider deletion marker.'),
    activeId: z.string().optional().describe('Active customer ID when the resource has been transferred between entities.'),
    lastName: z.string().optional().describe('Customer family name if set.'),
    createdAt: z.iso.datetime({ offset: true }).describe('Creation instant in UTC.'),
    firstName: z.string().optional().describe('Customer given name if set.'),
    updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last update instant in UTC when present.'),
    businessEntityId: z.string().optional().describe('Owning business-entity ID when supplied.')
});

const OutputSchema = z
    .object({
        items: z.array(CustomerSchema).describe('Customer records in this provider page.'),
        nextCursor: z.string().optional().describe('Next page token, absent when no next_offset is returned.')
    })
    .describe('One page of customers plus the continuation token for the next page.');

const ProviderCustomerSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    deleted: z.boolean(),
    active_id: z.string().optional(),
    business_entity_id: z.string().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int().optional()
});

const ProviderPageSchema = z.object({
    list: z.array(z.object({ customer: ProviderCustomerSchema })),
    next_offset: z.string().optional()
});

const ProviderHttpErrorSchema = z.object({
    response: z.object({
        status: z.number().int(),
        data: z.unknown().optional()
    })
});

const ProviderErrorBodySchema = z.object({
    message: z.string().optional()
});

function filterFingerprint(email: string | undefined, company: string | undefined, includeDeleted: boolean): string {
    return createHash('sha256')
        .update(JSON.stringify([email ?? '', company ?? '', includeDeleted]))
        .digest('base64url');
}

function encodeCursor(offset: string, fingerprint: string): string {
    return `${fingerprint}.${Buffer.from(offset, 'utf8').toString('base64url')}`;
}

function decodeCursor(cursor: string, fingerprint: string): string {
    const separator = cursor.indexOf('.');
    const offset = separator > 0 ? Buffer.from(cursor.slice(separator + 1), 'base64url').toString('utf8') : '';
    if (separator <= 0 || cursor.slice(0, separator) !== fingerprint || offset.length === 0) {
        throw new Error(
            'invalid_request: The cursor is malformed or was issued for different filters. Pass nextCursor with unchanged filters or restart without cursor.'
        );
    }
    return offset;
}

function unixSecondsToRfc3339Utc(seconds: number): string {
    return `${new Date(seconds * 1000).toISOString().slice(0, 19)}Z`;
}

function mapProviderError(error: unknown): Error {
    const parsed = ProviderHttpErrorSchema.safeParse(error);
    if (!parsed.success) {
        return error instanceof Error ? error : new Error(String(error));
    }
    const { status, data } = parsed.data.response;
    const body = ProviderErrorBodySchema.safeParse(data ?? {});
    const suffix = body.success && body.data.message ? ` Provider detail: ${body.data.message}` : '';
    if (status === 400) {
        return new Error(`invalid_request: Chargebee rejected the filter or cursor. Correct the filter or restart without cursor.${suffix}`);
    }
    if (status === 401 || status === 403) {
        return new Error(`permission_denied: The API key cannot read this customer collection. Ask an administrator for access.${suffix}`);
    }
    if (status === 429) {
        return new Error(`rate_limited: Chargebee rate-limited the page request. Wait and retry the page.${suffix}`);
    }
    if (status >= 500) {
        return new Error(`provider_unavailable: Chargebee reported a server failure. Retry later.${suffix}`);
    }
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * @tags: [read]
 * @tagReason: Performs a single idempotent GET that reads one page of customers; it never mutates provider data.
 * @pitfalls: updatedAt is present only for customers updated after 2016-09-28, and a customer transferred between business entities can appear under more than one id with activeId identifying the active version.
 */
const tool = createTool({
    name: 'list-customers',
    description: 'List one page of customers with optional exact email, company, or deletion filters.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to find customer IDs before reading or editing accounts. Use `get-customer` for a known ID. Pass nextCursor as cursor with unchanged filters for the next page. Email matching does not establish uniqueness.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const limit = input.limit ?? DEFAULT_LIMIT;
        const includeDeleted = input.includeDeleted ?? false;
        const fingerprint = filterFingerprint(input.email, input.company, includeDeleted);
        const offset = input.cursor !== undefined ? decodeCursor(input.cursor, fingerprint) : undefined;

        let responseData: unknown;
        // @allowTryCatch: translate Chargebee HTTP error statuses into the tool's public error codes.
        try {
            const response = await nango.get({
                // https://apidocs.chargebee.com/docs/api/customers/list-customers
                endpoint: '/api/v2/customers',
                params: {
                    limit,
                    include_deleted: includeDeleted ? 'true' : 'false',
                    ...(input.email !== undefined && { 'email[is]': input.email }),
                    ...(input.company !== undefined && { 'company[is]': input.company }),
                    ...(offset !== undefined && { offset })
                },
                retries: 3
            });
            responseData = response.data;
        } catch (error) {
            throw mapProviderError(error);
        }

        const page = ProviderPageSchema.safeParse(responseData);
        if (!page.success) {
            throw new Error('provider_unavailable: Chargebee returned an unexpected customer page. Retry later.');
        }

        const items = page.data.list.map((entry) => {
            const customer = entry.customer;
            return {
                id: customer.id,
                deleted: customer.deleted,
                createdAt: unixSecondsToRfc3339Utc(customer.created_at),
                ...(customer.email !== undefined && { email: customer.email }),
                ...(customer.company !== undefined && { company: customer.company }),
                ...(customer.first_name !== undefined && { firstName: customer.first_name }),
                ...(customer.last_name !== undefined && { lastName: customer.last_name }),
                ...(customer.active_id !== undefined && { activeId: customer.active_id }),
                ...(customer.business_entity_id !== undefined && { businessEntityId: customer.business_entity_id }),
                ...(customer.updated_at !== undefined && { updatedAt: unixSecondsToRfc3339Utc(customer.updated_at) })
            };
        });

        const nextOffset = page.data.next_offset;
        return {
            items,
            ...(nextOffset !== undefined && { nextCursor: encodeCursor(nextOffset, fingerprint) })
        };
    }
});

export default tool;
