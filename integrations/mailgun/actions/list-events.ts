import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain to list events for. Example: "mg.example.com"'),
        event: z
            .string()
            .optional()
            .describe(
                'Filter by event type, e.g. "delivered", "rejected", "bounced", "complained", "unsubscribed", "opened", "clicked", "accepted", "failed", "stored". Omit to return all event types.'
            ),
        begin: z
            .string()
            .optional()
            .describe('Start of the time window as an RFC 2822 date string or unix epoch timestamp. Example: "Fri, 26 Sep 2026 00:00:00 GMT"'),
        end: z.string().optional().describe('End of the time window as an RFC 2822 date string or unix epoch timestamp. Defaults to the current time.'),
        limit: z.number().int().min(1).max(300).optional().describe('Maximum number of events to return per page (1-300). Defaults to the provider default.'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor: the full "next_cursor" URL returned by a previous call. When provided, all other filter inputs are ignored because they are embedded in the cursor URL.'
            )
    })
    .describe('Input for listing Mailgun event log entries of a domain');

const EventSchema = z
    .object({
        id: z.string().describe('Unique identifier of the event. Example: "CPgfbmQMTCKtHW6uIWtuVe"'),
        event: z.string().describe('The type of the event. Example: "delivered"'),
        timestamp: z.number().describe('Unix epoch timestamp of the event in seconds (may include a fractional part). Example: 1759420800.123456'),
        recipient: z.string().optional().describe('Email address of the recipient the event relates to. Example: "user@example.com"'),
        reason: z.string().optional().describe('Short reason code attached to failed or rejected events. Example: "suppress-bounce"'),
        tags: z.array(z.string()).optional().describe('Tags attached to the message that generated the event'),
        message: z.record(z.string(), z.unknown()).optional().describe('Message details, including headers, when present on the event'),
        'delivery-status': z
            .record(z.string(), z.unknown())
            .optional()
            .describe('SMTP delivery details (mx host, response code, description, TLS) when present on the event')
    })
    .passthrough();

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('Event log entries for the domain, newest first unless an ascending cursor is used'),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'URL of the next page of events. Pass it back as the "cursor" input to fetch the next page. Omitted when the provider returned no next link.'
            )
    })
    .describe('A page of Mailgun event log entries with a cursor to the next page');

const PagingSchema = z
    .object({
        first: z.string().optional(),
        next: z.string().optional(),
        previous: z.string().optional(),
        last: z.string().optional()
    })
    .optional();

const ProviderResponseSchema = z.object({
    items: z.array(EventSchema),
    paging: PagingSchema
});

/**
 * @tags: [read]
 * @tagReason: Only fetches event log entries from the provider; it never mutates provider state.
 * @pitfalls: Event logs have limited, plan-based retention, so older events eventually disappear from results. Mailgun returns a next-page link on every page including the last, so callers must treat an empty events array as the end of the results.
 */
const action = createAction({
    description: 'List delivery/open/click/bounce/complaint event log entries for a domain',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        let params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            let url: URL;
            // @allowTryCatch: URL throws a TypeError on malformed input; convert it into a clean ActionError for the caller.
            try {
                url = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a valid next-page URL returned as next_cursor by a previous list-events call'
                });
            }
            endpoint = url.pathname + url.search;
        } else {
            endpoint = `/v3/${encodeURIComponent(input.domain)}/events`;
            params = {
                ...(input.event !== undefined && { event: input.event }),
                ...(input.begin !== undefined && { begin: input.begin }),
                ...(input.end !== undefined && { end: input.end }),
                ...(input.limit !== undefined && { limit: input.limit })
            };
        }

        // https://documentation.mailgun.com/
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            events: parsed.items,
            ...(parsed.paging?.next && { next_cursor: parsed.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
