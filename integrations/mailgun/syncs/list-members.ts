import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListMemberSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Stable unique record id composed as "<list_address>/<member_address>", because a member address is only unique within its parent mailing list'
            ),
        list_address: z.string().describe('Address of the parent mailing list this member belongs to, e.g. "announce@example.com"'),
        address: z.string().describe('Email address of the mailing list member, e.g. "jane@example.com"'),
        name: z.string().optional().describe('Display name of the member as stored by Mailgun (empty string when never provided)'),
        subscribed: z
            .boolean()
            .optional()
            .describe('Whether the member is currently subscribed to the mailing list; false means unsubscribed but still on the list'),
        vars: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Custom JSON variables attached to the member, keyed by variable name, e.g. { "phone": "+972559221288" }')
    })
    .describe('A member of a Mailgun mailing list, tagged with the address of its parent list');

// Internal schemas used only to parse provider responses; descriptions intentionally omitted.
const MailingListItemSchema = z.object({
    address: z.string()
});

const MemberItemSchema = z.object({
    address: z.string(),
    name: z.string().nullish(),
    subscribed: z.boolean().optional(),
    vars: z.record(z.string(), z.unknown()).optional()
});

/**
 * Extracts the query parameters from a Mailgun `paging.next` URL so they can be forwarded
 * to the proxy as-is. Mailgun returns full absolute URLs (including the regional host), so
 * only the query string is reused and the proxy keeps resolving the connection's region.
 */
function extractNextPageParams(nextUrl: string | undefined): Record<string, string> | undefined {
    if (!nextUrl) {
        return undefined;
    }
    const queryStart = nextUrl.indexOf('?');
    if (queryStart === -1) {
        return undefined;
    }
    const params: Record<string, string> = {};
    new URLSearchParams(nextUrl.slice(queryStart + 1)).forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

/**
 * Manual pagination over Mailgun's `/pages` endpoints. `nango.paginate` cannot be used here:
 * the cursor paginator would pass the full `paging.next` URL as the cursor parameter value,
 * and the link paginator loops forever because Mailgun's empty final page returns a bare
 * `?page=next` link that wraps back to the first page. This loop stops as soon as a page
 * returns no items or no `paging.next` link.
 */
async function* fetchAllPages<T>(nango: NangoSyncLocal, endpoint: string, itemSchema: z.ZodType<T>): AsyncGenerator<T[]> {
    const PageSchema = z.object({
        items: z.array(itemSchema),
        paging: z.object({ next: z.string().optional() }).optional()
    });

    let pageParams: Record<string, string> | undefined;
    let hasMore = true;

    while (hasMore) {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/ - Mailgun HTTP API v3 paginated list endpoints (GET /v3/lists/pages, GET /v3/lists/{list_address}/members/pages)
            endpoint,
            params: { limit: 100, ...pageParams },
            retries: 3
        };
        const response = await nango.get(config);
        const parsed = PageSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Unexpected response shape from Mailgun endpoint ${endpoint}: ${parsed.error.message}`);
        }

        const items = parsed.data.items;
        if (items.length > 0) {
            yield items;
        }

        const nextParams = items.length > 0 ? extractNextPageParams(parsed.data.paging?.next) : undefined;
        if (nextParams) {
            pageParams = nextParams;
        } else {
            hasMore = false;
        }
    }
}

const sync = createSync({
    description:
        'Sync members across all Mailgun mailing lists: enumerate every mailing list, then fetch every member of each list tagged with its parent list address',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ListMember: ListMemberSchema
    },

    exec: async (nango) => {
        // Full refresh per list on every run: member objects carry no updated-at field and the
        // members endpoint exposes no modified-since filter, so there is no change source to
        // checkpoint against. This run is delete-tracked, therefore it always starts from page 1.

        // Prerequisite: enumerate every mailing list before opening the delete-tracking window,
        // so a failure in this step cannot cause members to be falsely marked as deleted.
        const listAddresses: string[] = [];
        for await (const lists of fetchAllPages(nango, '/v3/lists/pages', MailingListItemSchema)) {
            for (const list of lists) {
                listAddresses.push(list.address);
            }
        }

        await nango.trackDeletesStart('ListMember');

        for (const listAddress of listAddresses) {
            const membersEndpoint = `/v3/lists/${encodeURIComponent(listAddress)}/members/pages`;
            for await (const members of fetchAllPages(nango, membersEndpoint, MemberItemSchema)) {
                const records = members.map((member) => ({
                    id: `${listAddress}/${member.address}`,
                    list_address: listAddress,
                    address: member.address,
                    ...(member.name != null && { name: member.name }),
                    ...(member.subscribed !== undefined && { subscribed: member.subscribed }),
                    ...(member.vars !== undefined && { vars: member.vars })
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'ListMember');
                }
            }
        }

        // Close the delete-tracking window opened above now that the full scan has completed.
        await nango.trackDeletesEnd('ListMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
