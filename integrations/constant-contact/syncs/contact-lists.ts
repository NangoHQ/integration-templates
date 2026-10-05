import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactListSchema = z
    .object({
        id: z.string().describe("The contact list's unique identifier (UUID), e.g. 'c3639a04-bc12-11f1-aa3a-02420a320002'."),
        name: z.string().describe('Display name of the contact list.'),
        description: z.string().optional().describe('Free-form description of the contact list.'),
        favorite: z.boolean().optional().describe('Whether the list is flagged as a favorite in the Constant Contact account.'),
        created_at: z.string().optional().describe('ISO-8601 timestamp of when the contact list was created, e.g. 2026-09-29T17:34:36Z.'),
        updated_at: z.string().optional().describe('ISO-8601 timestamp of when the contact list was last updated.'),
        membership_count: z
            .number()
            .optional()
            .describe('Total number of contacts that are members of the list (requested with include_membership_count=all). Not present on segment-type lists.')
    })
    .describe('A Constant Contact contact list used to segment account contacts for campaign audiences.');

const ProviderContactListSchema = z.object({
    list_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    favorite: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    membership_count: z.number().optional()
});

const CheckpointSchema = z.object({
    next_page_path: z
        .string()
        .describe('Provider-supplied next page path from `_links.next.href`; used to resume an in-progress full refresh without restarting from page 1.')
});

function normalizeNextPagePath(nextPageParam: string | undefined): string | undefined {
    const trimmed = nextPageParam?.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const url = new URL(trimmed);
        return `${url.pathname}${url.search}`;
    } catch {
        return trimmed;
    }
}

const sync = createSync({
    description: 'Sync contact lists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ContactList: ContactListSchema
    },

    exec: async (nango) => {
        // Full refresh blocker: GET /v3/contact_lists accepts updated_after but
        // silently ignores it, so there is no usable change filter. Resume state is
        // only the provider's `_links.next.href` link, which lets an interrupted
        // delete-tracked crawl continue instead of restarting from page 1.
        const rawCheckpoint: unknown = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;
        let nextPagePath = normalizeNextPagePath(checkpoint?.next_page_path);
        let deleteTrackingStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html#/Contact_Lists/getLists
            endpoint: nextPagePath ?? '/v3/contact_lists',
            ...(!nextPagePath
                ? {
                      params: {
                          include_membership_count: 'all'
                      }
                  }
                : {}),
            paginate: {
                type: 'link',
                link_path_in_response_body: '_links.next.href',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'lists',
                on_page: async ({ nextPageParam }) => {
                    nextPagePath = normalizeNextPagePath(typeof nextPageParam === 'string' ? nextPageParam : undefined);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const contactLists = page.map((item) => {
                // Parse failures must throw inside a delete-tracked crawl: silently skipping a record would
                // cause trackDeletesEnd to falsely mark it as deleted.
                const list = ProviderContactListSchema.parse(item);
                return {
                    id: list.list_id,
                    name: list.name,
                    ...(list.description !== undefined && { description: list.description }),
                    ...(list.favorite !== undefined && { favorite: list.favorite }),
                    ...(list.created_at !== undefined && { created_at: list.created_at }),
                    ...(list.updated_at !== undefined && { updated_at: list.updated_at }),
                    ...(list.membership_count !== undefined && { membership_count: list.membership_count })
                };
            });

            // Only start delete tracking once a page has actually produced validated records,
            // so neither a parsing failure nor a transient empty response can leave delete
            // tracking open (and later wipe every previously synced contact list) without ever
            // having seen real data.
            if (!deleteTrackingStarted && contactLists.length > 0) {
                await nango.trackDeletesStart('ContactList');
                deleteTrackingStarted = true;
            }

            if (contactLists.length > 0) {
                await nango.batchSave(contactLists, 'ContactList');
            }

            if (nextPagePath) {
                await nango.saveCheckpoint({ next_page_path: nextPagePath });
            }
        }

        await nango.clearCheckpoint();

        // Close the delete-tracking window exactly once, only after every page was crawled and saved.
        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('ContactList');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
