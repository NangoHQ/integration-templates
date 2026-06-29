import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    docId: z.string()
});

const FormulaSchema = z.object({
    id: z.string(),
    name: z.string(),
    href: z.string().optional(),
    parentId: z.string().optional(),
    parentName: z.string().optional(),
    parentType: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const FormulaItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    href: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional(),
            href: z.string().optional(),
            browserLink: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync named formulas for a configured doc',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/formulas'
        }
    ],
    models: {
        Formula: FormulaSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.docId) {
            throw new Error('docId is required in metadata');
        }

        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { pageToken: '' });
        let nextPageToken: string | undefined = checkpoint.pageToken || undefined;

        if (!nextPageToken) {
            await nango.trackDeletesStart('Formula');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://coda.io/developers/apis/v1#tag/Formulas/operation/listFormulas
            endpoint: `/docs/${encodeURIComponent(metadata.docId)}/formulas`,
            params: {
                ...(nextPageToken ? { pageToken: nextPageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const formulas: Array<{
                id: string;
                name: string;
                href?: string;
                parentId?: string;
                parentName?: string;
                parentType?: string;
            }> = [];

            for (const raw of page) {
                const parsed = FormulaItemSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse formula: ${parsed.error.message}`);
                }
                const item = parsed.data;
                formulas.push({
                    id: item.id,
                    name: item.name,
                    ...(item.href != null && { href: item.href }),
                    ...(item.parent?.id != null && { parentId: item.parent.id }),
                    ...(item.parent?.name != null && { parentName: item.parent.name }),
                    ...(item.parent?.type != null && { parentType: item.parent.type })
                });
            }

            if (formulas.length > 0) {
                await nango.batchSave(formulas, 'Formula');
            }

            await nango.saveCheckpoint({ pageToken: nextPageToken ?? '' });
        }

        await nango.trackDeletesEnd('Formula');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
