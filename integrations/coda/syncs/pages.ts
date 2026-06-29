import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PageItemSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        type: z.string().nullish(),
        browserLink: z.string().nullish(),
        updatedAt: z.string().nullish(),
        createdAt: z.string().nullish()
    })
    .passthrough();

const PageSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    browserLink: z.string().optional(),
    updatedAt: z.string().optional(),
    createdAt: z.string().optional()
});

const ListPagesResponseSchema = z.object({
    items: z.array(z.unknown()),
    nextPageToken: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const MetadataSchema = z.object({
    docId: z.string()
});

const sync = createSync({
    description: 'Sync pages for a configured doc',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Page: PageSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = metadata != null ? MetadataSchema.parse(metadata) : MetadataSchema.parse({});
        if (!parsedMetadata.docId) {
            throw new Error('docId is required in metadata');
        }

        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { pageToken: '' });
        let pageToken: string | undefined = checkpoint.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Page');
        }

        const baseEndpoint = `/docs/${encodeURIComponent(parsedMetadata.docId)}/pages`;

        // Coda API rejects limit when pageToken is present, so nango.paginate is not usable.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const params: Record<string, string> = {};
            if (pageToken) {
                params['pageToken'] = pageToken;
            } else {
                // Coda API rejects limit when pageToken is present.
                params['limit'] = '100';
            }

            const proxyConfig: ProxyConfiguration = {
                // https://coda.io/developers/apis/v1#list-pages
                endpoint: baseEndpoint,
                params,
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsedResponse = ListPagesResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse response: ${parsedResponse.error.message}`);
            }
            const data = parsedResponse.data;

            const pages = data.items.map((record) => {
                const parsed = PageItemSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse page: ${parsed.error.message}`);
                }
                const item = parsed.data;
                return {
                    id: item.id,
                    ...(item.name != null && { name: item.name }),
                    ...(item.type != null && { type: item.type }),
                    ...(item.browserLink != null && { browserLink: item.browserLink }),
                    ...(item.updatedAt != null && { updatedAt: item.updatedAt }),
                    ...(item.createdAt != null && { createdAt: item.createdAt })
                };
            });

            if (pages.length > 0) {
                await nango.batchSave(pages, 'Page');
            }

            pageToken = data.nextPageToken;
            await nango.saveCheckpoint({ pageToken: pageToken ?? '' });

            if (!pageToken) {
                break;
            }
        }

        await nango.trackDeletesEnd('Page');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
