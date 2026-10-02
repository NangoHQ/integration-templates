import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The domain whose sending allowlist should be listed. Example: "mg.example.com"'),
        limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of entries to return (1-1000). Defaults to 100 when omitted'),
        term: z.string().optional().describe('Optional prefix filter. Only entries whose address starts with this substring are returned'),
        cursor: z
            .string()
            .optional()
            .describe('Full pagination URL returned as nextCursor by a previous call. When provided, domain, limit and term are ignored')
    })
    .describe("Input for listing a domain's sending allowlist entries");

const WhitelistEntrySchema = z.object({
    value: z.string().describe('The allowlisted address or domain. Example: "user@example.com"'),
    type: z.string().describe('Entry type: "address" for a single address or "domain" for an entire domain'),
    reason: z.string().optional().describe('User-provided reason recorded when the entry was added. Omitted when no reason was given'),
    createdAt: z.string().describe('Timestamp for when the entry was created, in RFC 822 format. Example: "Tue, 12 Aug 2025 20:00:06 UTC"')
});

const OutputSchema = z
    .object({
        items: z.array(WhitelistEntrySchema).describe('Allowlist entries for the requested page. Empty when the domain has no allowlist entries'),
        nextCursor: z.string().optional().describe('URL to pass as cursor to fetch the next page. Absent when there are no more pages')
    })
    .describe("The domain's sending allowlist entries and pagination state");

const ProviderWhitelistEntrySchema = z.object({
    value: z.string(),
    type: z.string(),
    reason: z.string().optional(),
    createdAt: z.string()
});

const ProviderWhitelistResponseSchema = z.object({
    items: z.array(ProviderWhitelistEntrySchema),
    paging: z.object({
        first: z.string().optional(),
        last: z.string().optional(),
        next: z.string().optional(),
        previous: z.string().optional()
    })
});

/**
 * @tags: [read]
 * @tagReason: Only performs a GET request to list the domain's allowlist entries; it never mutates provider state.
 * @pitfalls: nextCursor can be present even when the current page already contains the last entry, so its presence alone does not guarantee more results; an empty items page is the reliable end signal. Entries created without a reason return reason as an empty string rather than omitting the field.
 */
const action = createAction({
    description: "List a domain's sending allowlist (whitelist) entries",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        let params: Record<string, string | number>;

        if (input.cursor !== undefined) {
            if (!URL.canParse(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a full paging URL returned as nextCursor by a previous call'
                });
            }
            const cursorUrl = new URL(input.cursor);
            if (!cursorUrl.pathname.includes('/whitelists')) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a whitelists paging URL returned as nextCursor by a previous call'
                });
            }
            endpoint = cursorUrl.pathname;
            params = Object.fromEntries(cursorUrl.searchParams);
        } else {
            endpoint = `/v3/${encodeURIComponent(input.domain)}/whitelists`;
            params = {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.term !== undefined && { term: input.term })
            };
        }

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/allowlist/get-v3--domainid--whitelists
            endpoint,
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderWhitelistResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                value: item.value,
                type: item.type,
                createdAt: item.createdAt,
                ...(item.reason !== undefined && { reason: item.reason })
            })),
            ...(parsed.paging.next !== undefined && parsed.paging.next !== '' && { nextCursor: parsed.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
