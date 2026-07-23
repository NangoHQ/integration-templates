import { z } from 'zod';
import { createAction } from 'nango';

const SKIPTOKEN_CURSOR_PREFIX = 'skiptoken:';

const InputSchema = z.object({
    cursor: z
        .string()
        .regex(new RegExp(`^(\\d+|${SKIPTOKEN_CURSOR_PREFIX}.+)$`))
        .optional()
        .describe('Pagination cursor from the previous response ($skip value, or a $skiptoken-derived cursor). Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('If true, returns data across all companies. Defaults to false.')
});

const ProviderItemSchema = z.object({}).passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(ProviderItemSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sales quotation headers',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        let skip = 0;
        let skiptoken: string | undefined;
        if (input.cursor?.startsWith(SKIPTOKEN_CURSOR_PREFIX)) {
            skiptoken = input.cursor.slice(SKIPTOKEN_CURSOR_PREFIX.length);
        } else if (input.cursor) {
            skip = parseInt(input.cursor, 10);
        }

        const params: Record<string, string | number> = {
            $top: limit,
            // Only one of $skip/$skiptoken is sent: once the provider hands back a $skiptoken,
            // that opaque continuation must be replayed as-is rather than switched back to an
            // offset, since offset and token-based paging are not interchangeable mid-scan.
            ...(skiptoken != null ? { $skiptoken: skiptoken } : { $skip: skip })
        };

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationHeadersV2',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const items = parsed.value;

        let nextCursor: string | undefined;
        if (parsed['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and preserve whichever continuation
            // mechanism it used. nextLink may be an absolute URL or a relative path, so parse it
            // against a fixed base to support both.
            const nextUrl = new URL(parsed['@odata.nextLink'], 'https://dynamics.local');
            const nextSkiptoken = nextUrl.searchParams.get('$skiptoken');
            const nextSkip = nextUrl.searchParams.get('$skip');
            if (nextSkiptoken != null) {
                nextCursor = `${SKIPTOKEN_CURSOR_PREFIX}${nextSkiptoken}`;
            } else {
                nextCursor = nextSkip ?? String(skip + items.length);
            }
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + limit);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
