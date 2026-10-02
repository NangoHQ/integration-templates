import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('Domain to list bounce suppression entries for. Example: "mg.example.com".'),
        limit: z
            .number()
            .int()
            .positive()
            .max(1000)
            .optional()
            .describe('Maximum number of bounce entries to return per page. Mailgun defaults to 100 and caps at 1000.'),
        term: z.string().optional().describe('Only return bounce entries whose address starts with this substring.'),
        cursor: z
            .string()
            .optional()
            .describe('Pagination URL from a previous response next_cursor (a full provider URL or a /v3/... path). Omit for the first page.')
    })
    .describe('Filters for listing the bounce suppression entries of a domain.');

const BounceSchema = z.object({
    address: z.string().describe('Recipient address that bounced. Example: "alice@example.com".'),
    code: z.string().optional().describe('SMTP error code returned by the receiving server. Example: "550".'),
    error: z.string().optional().describe('Bounce error message returned by the receiving server.'),
    created_at: z.string().optional().describe('When the bounce was recorded, in RFC 2822 format. Example: "Fri, 21 Oct 2011 11:02:55 GMT".')
});

const OutputSchema = z
    .object({
        bounces: z.array(BounceSchema).describe('Bounce suppression entries for the requested page.'),
        next_cursor: z.string().optional().describe('Provider URL of the next results page. Present when more pages exist; pass it back as cursor to continue.')
    })
    .describe('One page of bounce suppression entries for a domain.');

const ProviderBounceSchema = z.object({
    address: z.string(),
    code: z.union([z.string(), z.number()]).optional(),
    error: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderListBouncesResponseSchema = z.object({
    items: z.array(ProviderBounceSchema),
    paging: z
        .object({
            first: z.string().optional(),
            last: z.string().optional(),
            next: z.string().optional(),
            previous: z.string().optional()
        })
        .optional()
});

function cursorToEndpoint(cursor: string): string {
    const trimmed = cursor.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        return url.pathname + url.search;
    }
    return trimmed;
}

/**
 * @tags: [read]
 * @tagReason: Performs only a read-only GET of a domain's bounce suppression entries and never mutates provider state.
 * @pitfalls: When cursor is provided it embeds the original domain and filters, so the domain, limit, and term inputs are ignored. next_cursor can be present even when the current page is not full, and following it may return an empty page.
 */
const action = createAction({
    description: 'List hard-bounce suppression entries for a domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursor = input.cursor !== undefined ? input.cursor.trim() : '';
        const useCursor = cursor !== '';
        const endpoint = useCursor ? cursorToEndpoint(cursor) : `/v3/${encodeURIComponent(input.domain)}/bounces`;
        const params: { limit?: number; term?: string } = useCursor
            ? {}
            : {
                  ...(input.limit !== undefined && { limit: input.limit }),
                  ...(input.term !== undefined && { term: input.term })
              };

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/get-v3--domainid--bounces
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderListBouncesResponseSchema.parse(response.data);
        const nextPage = parsed.paging?.next;

        return {
            bounces: parsed.items.map((bounce) => ({
                address: bounce.address,
                ...(bounce.code !== undefined && { code: String(bounce.code) }),
                ...(bounce.error !== undefined && { error: bounce.error }),
                ...(bounce.created_at !== undefined && { created_at: bounce.created_at })
            })),
            ...(nextPage !== undefined && nextPage !== '' && { next_cursor: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
