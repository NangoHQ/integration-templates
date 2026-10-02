import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MailingListSchema = z
    .object({
        id: z
            .string()
            .describe('Unique record identifier. Same value as the mailing list address, which Mailgun uses as the list ID (e.g. "newsletter@example.com").'),
        address: z.string().describe('Email address that identifies the mailing list (e.g. "newsletter@example.com").'),
        name: z.string().optional().describe('Human-readable name of the mailing list.'),
        description: z.string().optional().describe('Description of the mailing list. Empty string when none is set.'),
        access_level: z.string().optional().describe('Who can post to the list: "readonly", "members", or "everyone".'),
        reply_preference: z
            .string()
            .optional()
            .describe('Where replies to list messages are sent: "list" or "sender". Omitted when the list has no explicit preference stored.'),
        members_count: z.number().optional().describe('Number of subscribed members on the mailing list.'),
        created_at: z
            .string()
            .optional()
            .describe('List creation timestamp in RFC 5322 format as returned by Mailgun (e.g. "Tue, 15 Sep 2026 16:29:03 -0000").')
    })
    .describe('A Mailgun mailing list on the account.');

const MailgunListSchema = z.object({
    access_level: z.string().optional(),
    address: z.string(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    members_count: z.number().optional(),
    name: z.string().optional(),
    reply_preference: z.string().nullable().optional()
});

const MailgunListsPageSchema = z.object({
    items: z.array(MailgunListSchema)
});

const PAGE_LIMIT = 100;

const sync = createSync({
    description: 'Sync mailing lists on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        MailingList: MailingListSchema
    },

    exec: async (nango) => {
        // Full refresh with deletion detection. Mailgun list objects only expose
        // created_at (no updated-at) and GET /v3/lists/pages has no changed-since
        // filter, so every run walks all lists starting from the first page: no
        // cursor is restored from a checkpoint and no checkpoint is persisted
        // mid-scan while delete tracking is open.
        await nango.trackDeletesStart('MailingList');

        let anchor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/get-v3-lists-pages
                endpoint: '/v3/lists/pages',
                params: {
                    limit: PAGE_LIMIT,
                    ...(anchor !== undefined ? { page: 'next', address: anchor } : {})
                },
                retries: 3
            };
            const response = await nango.get(proxyConfig);
            // Throw on parse failure: skipping a record inside a delete-tracked
            // full refresh would falsely mark it as deleted at trackDeletesEnd.
            const page = MailgunListsPageSchema.parse(response.data);

            if (page.items.length === 0) {
                hasMore = false;
            } else {
                const lists = page.items.map((item) => ({
                    id: item.address,
                    address: item.address,
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.access_level !== undefined && { access_level: item.access_level }),
                    ...(item.reply_preference != null && { reply_preference: item.reply_preference }),
                    ...(item.members_count !== undefined && { members_count: item.members_count }),
                    ...(item.created_at !== undefined && { created_at: item.created_at })
                }));

                await nango.batchSave(lists, 'MailingList');

                // paging.next is always present, even on the last page, so page
                // size is the reliable end signal. The next page is requested with
                // page=next anchored at the last list address seen.
                const lastItem = page.items.at(-1);
                if (!lastItem || page.items.length < PAGE_LIMIT) {
                    hasMore = false;
                } else {
                    anchor = lastItem.address;
                }
            }
        }

        await nango.trackDeletesEnd('MailingList');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
