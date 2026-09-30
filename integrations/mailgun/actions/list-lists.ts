import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of mailing lists to return in one page. The provider applies its own default when omitted. Example: 100'),
        address: z
            .string()
            .optional()
            .describe('Filter to a single mailing list by its full address. Ignored when `cursor` is set. Example: "dev@samples.mailgun.org"'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Paging URL from the `next_cursor` field of a previous response, used to fetch the next page. Omit for the first page. When set, only its paging parameters are forwarded, so it is region-agnostic.'
            )
    })
    .describe('Input for listing mailing lists on the account.');

const MailingListSchema = z.object({
    address: z.string().describe('Full email-style address of the mailing list. Example: "dev@samples.mailgun.org"'),
    name: z.string().optional().describe('Human-readable name of the mailing list. Example: "dev"'),
    description: z.string().optional().describe('Description of the mailing list.'),
    access_level: z
        .string()
        .optional()
        .describe('Who can read or post to the list: "readonly", "members", or "everyone". Note: the provider defaults this to "readonly" at creation time.'),
    reply_preference: z.string().optional().describe('Where replies are directed: "list" or "sender". Omitted when the provider returns null.'),
    members_count: z.number().optional().describe('Number of subscribed members currently on the list.'),
    created_at: z.string().optional().describe('Creation timestamp of the list in RFC 2822 format. Example: "Tue, 12 Feb 2013 20:47:40 -0000"')
});

const OutputSchema = z
    .object({
        items: z.array(MailingListSchema).describe('Mailing lists on the account for the requested page.'),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'Provider paging URL for the next page. Pass it back as `cursor` to continue. The provider can keep returning a cursor past the final page, so stop paging when `items` comes back empty.'
            )
    })
    .describe('A page of mailing lists plus a cursor for the next page.');

const ProviderListSchema = z.object({
    access_level: z.string().optional(),
    address: z.string(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    members_count: z.number().optional(),
    name: z.string().optional(),
    reply_preference: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderListSchema),
    paging: z
        .object({
            first: z.string().optional(),
            last: z.string().optional(),
            next: z.string().optional(),
            previous: z.string().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET to list mailing lists and never mutates provider state.
 * @pitfalls: The provider can return an empty page while still providing a `next_cursor`, so stop paging when `items` is empty rather than when the cursor disappears. Lists show access_level "readonly" unless it was explicitly set otherwise at creation time, since that is the provider default.
 */
const action = createAction({
    description: 'List mailing lists on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.cursor !== undefined) {
            let parsed: URL;
            // @allowTryCatch: converts a malformed caller-supplied paging URL into a clean ActionError instead of an opaque URL constructor TypeError.
            try {
                parsed = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid paging URL as returned in next_cursor by a previous list-lists response.'
                });
            }
            parsed.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else if (input.address !== undefined) {
            params['address'] = input.address;
        }

        if (input.limit !== undefined) {
            params['limit'] = String(input.limit);
        }

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Mailing-Lists/ (GET /v3/lists/pages)
            endpoint: '/v3/lists/pages',
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const next = providerResponse.paging?.next;
        const nextCursor = next !== undefined && next !== '' ? next : undefined;

        return {
            items: providerResponse.items.map((list) => ({
                address: list.address,
                ...(list.name !== undefined && { name: list.name }),
                ...(list.description !== undefined && { description: list.description }),
                ...(list.access_level !== undefined && { access_level: list.access_level }),
                ...(list.reply_preference != null && { reply_preference: list.reply_preference }),
                ...(list.members_count !== undefined && { members_count: list.members_count }),
                ...(list.created_at !== undefined && { created_at: list.created_at })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
