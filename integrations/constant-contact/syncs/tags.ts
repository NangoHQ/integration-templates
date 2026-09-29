import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTagSchema = z.object({
    tag_id: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const TagSchema = z
    .object({
        id: z.string().describe("Unique identifier of the contact tag (Constant Contact's tag_id). Example: '4b200d7a-bc35-11f1-959b-02420a320002'"),
        name: z.string().describe("Display name of the contact tag. Example: 'nango-sync-tags-seed-1'"),
        created_at: z.string().describe("ISO 8601 timestamp of when the tag was created. Example: '2026-09-29T18:40:50Z'"),
        updated_at: z.string().describe("ISO 8601 timestamp of when the tag was last updated. Example: '2026-09-29T18:40:50Z'")
    })
    .describe('A Constant Contact contact tag used to label and segment contacts.');

const sync = createSync({
    description: 'Sync contact tags from Constant Contact.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['contact_data'],
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // GET /v3/contact_tags exposes no updated-since filter and there is no
        // deleted-tags endpoint, so this stays a full refresh with delete tracking.
        // No checkpoint is needed: Constant Contact caps tags at 500 per account and
        // this sync already requests limit=500, so the collection fits in one page.
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contact_tags',
            paginate: {
                type: 'link',
                link_path_in_response_body: '_links.next.href',
                response_path: 'tags',
                limit_name_in_request: 'limit',
                limit: 500
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            // Throw on malformed data instead of skipping records: inside a
            // delete-tracked crawl a skipped tag would be falsely marked as
            // deleted when trackDeletesEnd() runs.
            const tags = z.array(ProviderTagSchema).parse(page);
            if (tags.length === 0) {
                continue;
            }

            await nango.batchSave(
                tags.map((tag) => ({
                    id: tag.tag_id,
                    name: tag.name,
                    created_at: tag.created_at,
                    updated_at: tag.updated_at
                })),
                'Tag'
            );
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
