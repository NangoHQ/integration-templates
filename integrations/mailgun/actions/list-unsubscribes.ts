import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().min(1).describe('Domain to list unsubscribe suppressions for. Example: "mg.example.com"'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Maximum number of entries to return per page. Mailgun defaults to 100 and caps at 1000. Example: 100'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Pagination cursor for the next page, taken from next_cursor of a previous response. Omit for the first page.')
    })
    .describe('Input for listing unsubscribe suppression entries of a Mailgun domain.');

const UnsubscribeSchema = z.object({
    address: z.string().describe('Email address that is unsubscribed. Example: "alice@example.com"'),
    tags: z
        .array(z.string())
        .optional()
        .describe('Tags of the message the recipient unsubscribed from. ["*"] means unsubscribed from all mail for the domain.'),
    created_at: z.string().optional().describe('Timestamp of when the unsubscribe was recorded, in RFC 2822 format. Example: "Fri, 21 Oct 2011 06:02:36 GMT"')
});

const OutputSchema = z
    .object({
        items: z.array(UnsubscribeSchema).describe('Unsubscribe suppression entries for the requested page. Empty when no (further) entries exist.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor input to fetch the next page. Absent when there is no next page.')
    })
    .describe('A page of unsubscribe suppression entries for a Mailgun domain.');

const ProviderUnsubscribeSchema = z.object({
    address: z.string(),
    tags: z.array(z.string()).optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderUnsubscribeSchema),
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
 * @tagReason: Performs a read-only GET of the domain's unsubscribe suppression list and creates, modifies, or deletes no provider state.
 * @pitfalls: next_cursor can still be present on the final non-empty page and following it yields an empty page; stop paginating when a page returns no items, not when next_cursor is absent.
 */
const action = createAction({
    description: 'List unsubscribe suppression entries for a Mailgun domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribe/get-v3--domainid--unsubscribes
        const response = await nango.get({
            endpoint: `/v3/${encodeURIComponent(input.domain)}/unsubscribes`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { page: 'next', address: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        const nextPageUrl = parsed.paging?.next;
        if (nextPageUrl) {
            const divider = new URL(nextPageUrl).searchParams.get('address');
            if (divider) {
                nextCursor = divider;
            }
        }

        return {
            items: parsed.items.map((item) => ({
                address: item.address,
                ...(item.tags !== undefined && { tags: item.tags }),
                ...(item.created_at !== undefined && { created_at: item.created_at })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
