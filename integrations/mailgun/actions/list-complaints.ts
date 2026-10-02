import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The sending domain to list spam-complaint suppression entries for. Example: "mg.example.com"'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(10000)
            .optional()
            .describe('Maximum number of complaint entries to return in a single page (1-10000). The provider defaults to 100 when omitted.'),
        cursor: z
            .string()
            .url()
            .optional()
            .describe(
                'Full `next` page URL returned by a previous call, used to fetch the following page. When provided, `domain` and `limit` are ignored because the URL already encodes them. Omit for the first page.'
            )
    })
    .describe('Input for listing spam-complaint suppression entries of a Mailgun domain');

const ComplaintSchema = z
    .object({
        address: z.string().describe('Email address of the recipient that reported the message as spam. Example: "alice@example.com"'),
        code: z.string().optional().describe('Error code returned by the recipient mail server. Example: "550"'),
        error: z.string().optional().describe('Human-readable error message returned by the recipient mail server'),
        created_at: z.string().optional().describe('Timestamp of when the complaint was recorded, in RFC 2822 format. Example: "Mon, 26 Sep 2016 10:00:00 GMT"')
    })
    .describe('A single spam-complaint suppression entry');

const OutputSchema = z
    .object({
        items: z.array(ComplaintSchema).describe('Spam-complaint suppression entries for the domain'),
        next: z
            .string()
            .optional()
            .describe('URL of the next results page, present only when more entries exist. Pass it back as `cursor` to fetch the following page.')
    })
    .describe('Page of spam-complaint suppression entries for a Mailgun domain');

const ProviderComplaintSchema = z.object({
    address: z.string(),
    code: z.string().optional(),
    error: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderComplaintSchema),
    paging: z
        .object({
            first: z.string().nullable().optional(),
            last: z.string().nullable().optional(),
            next: z.string().nullable().optional(),
            previous: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only performs a GET request against the provider and never mutates any resource.
 * @pitfalls: Entries only appear after recipients report mail as spam, so the list is often empty in steady state. The provider can return a `next` page URL even when the current page is empty, so its presence does not guarantee more results. A domain provisioned in the EU region is not visible to a connection configured for the US region and returns a not-found error.
 */
const action = createAction({
    description: 'List spam-complaint suppression entries for a domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        let params: Record<string, string | number>;

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            params = Object.fromEntries(cursorUrl.searchParams);
        } else {
            endpoint = `/v3/${encodeURIComponent(input.domain)}/complaints`;
            params = {
                ...(input.limit !== undefined && { limit: input.limit })
            };
        }

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Complaints/
            endpoint,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextPage = parsed.paging?.next;

        return {
            items: parsed.items.map((item) => ({
                address: item.address,
                ...(item.code !== undefined && { code: item.code }),
                ...(item.error !== undefined && { error: item.error }),
                ...(item.created_at !== undefined && { created_at: item.created_at })
            })),
            ...(nextPage ? { next: nextPage } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
