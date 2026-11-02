import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum orders in this page; defaults to 10.'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque continuation from this tool, scoped to the connection, filters, sort, precision and limit; omit for the first page.'),
        search: z.string().min(1).optional().describe('Provider text-match string; not an arbitrary query language.'),
        sortBy: z
            .enum(['createdAt', 'updatedAt', 'id', 'includeOrder', 'title', 'slug'])
            .optional()
            .describe('Provider sort attribute; includeOrder follows includeIds and requires that filter.'),
        statuses: z
            .array(z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash']))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe("Restrict to these statuses; omitted means the provider's any-status selection."),
        parentIds: z
            .array(z.string().regex(/^[0-9]+$/))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Restrict to orders with these parent order identifiers.'),
        productId: z
            .string()
            .regex(/^[0-9]+$/)
            .optional()
            .describe('Restrict to orders containing this product identifier.'),
        createdVia: z
            .array(
                z
                    .string()
                    .min(1)
                    .regex(/^[^,]+$/)
            )
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Creation-source names, for example checkout or store-api; commas inside a source are not supported.'),
        customerId: z
            .string()
            .regex(/^[0-9]+$/)
            .optional()
            .describe('Store customer identifier; 0 selects guest ownership where supported.'),
        excludeIds: z
            .array(z.string().regex(/^[0-9]+$/))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Exclude these order identifiers.'),
        includeIds: z
            .array(z.string().regex(/^[0-9]+$/))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Restrict to these order identifiers.'),
        createdAfter: z.iso
            .datetime({ offset: true })
            .optional()
            .describe('Exclusive creation-time lower bound, RFC 3339 with explicit offset or Z; whole-second precision.'),
        updatedAfter: z.iso
            .datetime({ offset: true })
            .optional()
            .describe('Exclusive modification-time lower bound, RFC 3339 with explicit offset or Z; whole-second precision.'),
        createdBefore: z.iso
            .datetime({ offset: true })
            .optional()
            .describe('Exclusive creation-time upper bound, RFC 3339 with explicit offset or Z; whole-second precision.'),
        decimalPlaces: z
            .number()
            .int()
            .min(0)
            .max(8)
            .optional()
            .describe("Requested decimal places for returned monetary strings; defaults to the provider's documented two-place representation."),
        sortDirection: z.enum(['asc', 'desc']).optional().describe('Ascending or descending sort direction.'),
        updatedBefore: z.iso
            .datetime({ offset: true })
            .optional()
            .describe('Exclusive modification-time upper bound, RFC 3339 with explicit offset or Z; whole-second precision.'),
        excludeParentIds: z
            .array(z.string().regex(/^[0-9]+$/))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Exclude orders with these parent identifiers.')
    })
    .describe('Filters, sort, precision and continuation cursor for listing one page of orders.');

const OrderSummarySchema = z
    .object({
        id: z.string().describe('Store-scoped order identifier.'),
        total: z.string().describe("Grand total in currency major units, preserving the provider's decimal string."),
        number: z.string().describe('Customer-facing order number, distinct from the identifier.'),
        paidAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Payment instant in UTC, or null when unpaid; omitted if unavailable.'),
        status: z.string().describe('Current provider status, including extension-defined statuses if returned.'),
        currency: z.string().describe('Order currency code.'),
        totalTax: z.string().optional().describe('Total tax in currency major units.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant normalized from the GMT field to UTC with Z.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last modification instant normalized from the GMT field to UTC with Z.'),
        createdVia: z.string().optional().describe('Source through which the order was created.'),
        customerId: z.string().optional().describe('Owning customer identifier; 0 denotes a guest.'),
        completedAt: z.iso
            .datetime({ offset: true })
            .nullable()
            .optional()
            .describe('Completion instant in UTC, or null when not completed; omitted if unavailable.'),
        customerNote: z.string().optional().describe('Customer checkout note, including an empty string when blank.'),
        parentOrderId: z.string().optional().describe('Parent order identifier; 0 denotes no parent.'),
        transactionId: z.string().optional().describe('Payment transaction identifier; empty when unset.'),
        paymentGatewayId: z.string().optional().describe('Payment method identifier; empty when unset.')
    })
    .describe('Summary of one order for browsing.');

const OutputSchema = z
    .object({
        items: z
            .array(OrderSummarySchema)
            .describe('One provider page of order summaries; get-order supplies addresses, line items and detailed financial breakdowns.'),
        total: z.number().int().min(0).optional().describe('Total matching resources from X-WP-Total at the time of this response, not the length of items.'),
        nextCursor: z.string().optional().describe('Opaque continuation for the next page; omitted when pagination metadata says the collection is exhausted.')
    })
    .describe('One page of order summaries with the collection total and a continuation cursor when more pages exist.');

// Internal schemas used only to parse provider and runtime data; not part of the public contract.
const ProviderOrderSchema = z.looseObject({
    id: z.number().int(),
    number: z.string(),
    status: z.string(),
    currency: z.string(),
    total: z.string(),
    total_tax: z.string().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional(),
    date_paid_gmt: z.string().nullable().optional(),
    date_completed_gmt: z.string().nullable().optional(),
    created_via: z.string().optional(),
    customer_id: z.number().int().optional(),
    parent_id: z.number().int().optional(),
    customer_note: z.string().optional(),
    payment_method: z.string().optional(),
    transaction_id: z.string().optional()
});

const ConnectionIdSchema = z.looseObject({
    connection_id: z.string().optional()
});

const ResponseHeadersSchema = z.looseObject({
    'x-wp-total': z.string().optional(),
    'x-wp-totalpages': z.string().optional()
});

const HttpErrorSchema = z.looseObject({
    status: z.number().optional(),
    response: z.looseObject({ status: z.number().optional() }).optional()
});

type SortBy = 'createdAt' | 'updatedAt' | 'id' | 'includeOrder' | 'title' | 'slug';

const ORDER_BY: Record<SortBy, string> = {
    createdAt: 'date',
    updatedAt: 'modified',
    id: 'id',
    includeOrder: 'include',
    title: 'title',
    slug: 'slug'
};

const CURSOR_PATTERN = /^v1\.([1-9]\d*)\.([0-9a-f]{16})$/;

function computeScope(connectionId: string, filterParams: Record<string, unknown>): string {
    return createHash('sha256')
        .update(`${connectionId}\n${JSON.stringify(filterParams)}`)
        .digest('hex')
        .slice(0, 16);
}

function decodeCursorPage(cursor: string, expectedScope: string): number {
    const match = CURSOR_PATTERN.exec(cursor);
    if (match === null || match[1] === undefined || match[2] !== expectedScope) {
        throw new Error(
            'invalid_cursor: The cursor is invalid or belongs to a different connection or request scope; start again without cursor or reuse the unchanged filters and limit.'
        );
    }
    return Number(match[1]);
}

function encodeCursor(page: number, scope: string): string {
    return `v1.${page}.${scope}`;
}

function toUtcSecond(field: string, value: string): string {
    if (value.includes('.')) {
        throw new Error(`invalid_request: ${field} must use whole-second precision; fractional seconds are rejected, not rounded.`);
    }
    return new Date(value).toISOString().replace(/\.000Z$/, 'Z');
}

function normalizeGmtDate(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
        return `${value}Z`;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(
            `provider_error: The store returned the malformed GMT date '${value}'; retry the read later and ask the store administrator to investigate if it persists.`
        );
    }
    return parsed.toISOString();
}

function parseHeaderCount(value: string | undefined): number | undefined {
    if (value === undefined || !/^\d+$/.test(value)) {
        return undefined;
    }
    return Number(value);
}

/**
 * @tags: [read]
 * @tagReason: Sends a single read-only GET for one page of orders; it never writes, updates or deletes store data.
 * @pitfalls: Pages are not a stable snapshot, so orders created or modified between calls can shift across pages and total can change from page to page. Sorting by includeOrder without includeIds fails with invalid_request.
 */
const tool = createTool({
    name: 'list-orders',
    description:
        'List one page of orders, optionally restricted by text, customer, product, status, identifiers, creation source, or creation and modification dates.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use this to browse orders or find their IDs. Use `get-order` for a known order's detailed contents. Returns one page; pass nextCursor as cursor with the same filters and limit to continue. Dates require an explicit timezone. Pagination is not a snapshot, so concurrent changes can affect subsequent pages.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const limit = input.limit ?? 10;
        const sortBy: SortBy = input.sortBy ?? 'createdAt';
        const sortDirection = input.sortDirection ?? 'desc';
        const decimalPlaces = input.decimalPlaces ?? 2;

        if (sortBy === 'includeOrder' && input.includeIds === undefined) {
            throw new Error('invalid_request: sortBy includeOrder requires the includeIds filter.');
        }

        const createdAfterUtc = input.createdAfter === undefined ? undefined : toUtcSecond('createdAfter', input.createdAfter);
        const createdBeforeUtc = input.createdBefore === undefined ? undefined : toUtcSecond('createdBefore', input.createdBefore);
        const updatedAfterUtc = input.updatedAfter === undefined ? undefined : toUtcSecond('updatedAfter', input.updatedAfter);
        const updatedBeforeUtc = input.updatedBefore === undefined ? undefined : toUtcSecond('updatedBefore', input.updatedBefore);

        if (createdAfterUtc !== undefined && createdBeforeUtc !== undefined && createdAfterUtc >= createdBeforeUtc) {
            throw new Error('invalid_request: createdAfter must be earlier than createdBefore.');
        }
        if (updatedAfterUtc !== undefined && updatedBeforeUtc !== undefined && updatedAfterUtc >= updatedBeforeUtc) {
            throw new Error('invalid_request: updatedAfter must be earlier than updatedBefore.');
        }

        const hasDateFilter =
            createdAfterUtc !== undefined || createdBeforeUtc !== undefined || updatedAfterUtc !== undefined || updatedBeforeUtc !== undefined;

        const filterParams: Record<string, string | number | boolean | string[]> = {
            context: 'view',
            per_page: limit,
            orderby: ORDER_BY[sortBy],
            order: sortDirection,
            dp: decimalPlaces,
            ...(input.search !== undefined && { search: input.search }),
            ...(input.statuses !== undefined && { status: input.statuses }),
            ...(input.customerId !== undefined && { customer: input.customerId }),
            ...(input.productId !== undefined && { product: input.productId }),
            ...(input.includeIds !== undefined && { include: input.includeIds }),
            ...(input.excludeIds !== undefined && { exclude: input.excludeIds }),
            ...(input.parentIds !== undefined && { parent: input.parentIds }),
            ...(input.excludeParentIds !== undefined && { parent_exclude: input.excludeParentIds }),
            ...(input.createdVia !== undefined && { created_via: input.createdVia.join(',') }),
            ...(createdAfterUtc !== undefined && { after: createdAfterUtc }),
            ...(createdBeforeUtc !== undefined && { before: createdBeforeUtc }),
            ...(updatedAfterUtc !== undefined && { modified_after: updatedAfterUtc }),
            ...(updatedBeforeUtc !== undefined && { modified_before: updatedBeforeUtc }),
            ...(hasDateFilter && { dates_are_gmt: true })
        };

        const connection = await nango.getConnection();
        const parsedConnection = ConnectionIdSchema.safeParse(connection);
        const connectionId = parsedConnection.success ? (parsedConnection.data.connection_id ?? '') : '';

        const scope = computeScope(connectionId, filterParams);
        const page = input.cursor === undefined ? 1 : decodeCursorPage(input.cursor, scope);

        let response;
        // @allowTryCatch: Map provider HTTP error statuses onto the tool's public error codes.
        try {
            // https://developer.woocommerce.com/docs/apis/rest-api/v3/orders
            response = await nango.get({
                endpoint: '/wp-json/wc/v3/orders',
                params: { ...filterParams, page: page },
                retries: 3
            });
        } catch (error) {
            const parsedError = HttpErrorSchema.safeParse(error);
            const status = parsedError.success ? (parsedError.data.response?.status ?? parsedError.data.status) : undefined;
            if (status === 400 || status === 422) {
                throw new Error(
                    'invalid_request: The store rejected the filters or request; correct the filters, date bounds or sort selection and try again.'
                );
            }
            if (status === 401 || status === 403) {
                throw new Error(
                    "permission_denied: The key's access level or associated user's capabilities do not permit order reads; ask the store administrator for read access to orders."
                );
            }
            if (status === 404) {
                return { items: [] };
            }
            if (status !== undefined && status >= 500) {
                throw new Error(
                    'provider_error: WooCommerce reported an internal server error; retry the read later and ask the store administrator to investigate if it persists.'
                );
            }
            throw error;
        }

        const parsedOrders = z.array(ProviderOrderSchema).safeParse(response.data);
        if (!parsedOrders.success) {
            throw new Error(
                'provider_error: The store returned an unexpected orders response; retry the read later and ask the store administrator to investigate if it persists.'
            );
        }

        const parsedHeaders = ResponseHeadersSchema.safeParse(response.headers ?? {});
        const headers = parsedHeaders.success ? parsedHeaders.data : {};
        const total = parseHeaderCount(headers['x-wp-total']);
        const totalPages = parseHeaderCount(headers['x-wp-totalpages']);

        const items = parsedOrders.data.map((order) => ({
            id: String(order.id),
            total: order.total,
            number: order.number,
            ...(order.date_paid_gmt !== undefined && { paidAt: order.date_paid_gmt === null ? null : normalizeGmtDate(order.date_paid_gmt) }),
            status: order.status,
            currency: order.currency,
            ...(order.total_tax !== undefined && { totalTax: order.total_tax }),
            ...(order.date_created_gmt !== undefined && order.date_created_gmt !== null && { createdAt: normalizeGmtDate(order.date_created_gmt) }),
            ...(order.date_modified_gmt !== undefined && order.date_modified_gmt !== null && { updatedAt: normalizeGmtDate(order.date_modified_gmt) }),
            ...(order.created_via !== undefined && { createdVia: order.created_via }),
            ...(order.customer_id !== undefined && { customerId: String(order.customer_id) }),
            ...(order.date_completed_gmt !== undefined && {
                completedAt: order.date_completed_gmt === null ? null : normalizeGmtDate(order.date_completed_gmt)
            }),
            ...(order.customer_note !== undefined && { customerNote: order.customer_note }),
            ...(order.parent_id !== undefined && { parentOrderId: String(order.parent_id) }),
            ...(order.transaction_id !== undefined && { transactionId: order.transaction_id }),
            ...(order.payment_method !== undefined && { paymentGatewayId: order.payment_method })
        }));

        return {
            items: items,
            ...(total !== undefined && { total: total }),
            ...(totalPages !== undefined && page < totalPages && { nextCursor: encodeCursor(page + 1, scope) })
        };
    }
});

export default tool;
