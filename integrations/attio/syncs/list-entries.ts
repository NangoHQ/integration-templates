import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    list_id: z.string(),
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const ListSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        list_id: z.string()
    }),
    api_slug: z.string(),
    name: z.string(),
    parent_object: z.array(z.string()),
    workspace_access: z.string().nullable(),
    workspace_member_access: z.array(
        z.object({
            workspace_member_id: z.string(),
            level: z.string()
        })
    ),
    created_by_actor: z.object({
        id: z.string().nullable(),
        type: z.string().nullable()
    }),
    created_at: z.string()
});

const ListEntrySchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        list_id: z.string(),
        entry_id: z.string()
    }),
    parent_record_id: z.string().optional(),
    parent_object: z.string().optional(),
    created_at: z.string(),
    entry_values: z.record(z.string(), z.array(z.unknown())).optional()
});

const ListEntriesResponseSchema = z.object({
    data: z.array(ListEntrySchema)
});

const ListEntryModelSchema = z.object({
    id: z.string(),
    list_id: z.string(),
    parent_record_id: z.string().optional(),
    parent_object: z.string().optional(),
    created_at: z.string(),
    entry_values: z.record(z.string(), z.array(z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync list entries from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ListEntry: ListEntryModelSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/list-entries'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        const resumeListId = checkpoint.list_id || undefined;
        const resumeOffset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        if (!inProgress) {
            await nango.trackDeletesStart('ListEntry');
        }

        // https://docs.attio.com/rest-api/endpoint-reference/lists/get-lists
        const listsResponse = await nango.get({
            endpoint: '/v2/lists',
            retries: 3
        });

        const lists = z.array(ListSchema).parse(listsResponse.data.data);

        const startIndex = resumeListId ? lists.findIndex((list) => list.id.list_id === resumeListId) : 0;
        const listsToSync = startIndex >= 0 ? lists.slice(startIndex) : lists;

        for (const [index, list] of listsToSync.entries()) {
            const listId = list.id.list_id;
            let offset = index === 0 && startIndex >= 0 && resumeListId === listId ? resumeOffset : 0;
            let hasMore = true;

            while (hasMore) {
                const response = await nango.post({
                    // https://docs.attio.com/rest-api/endpoint-reference/entries/list-entries
                    endpoint: `/v2/lists/${listId}/entries/query`,
                    data: {
                        limit,
                        offset,
                        sorts: [{ direction: 'asc', attribute: 'created_at' }]
                    },
                    retries: 3
                });

                const parsedResponse = ListEntriesResponseSchema.parse(response.data);
                const page = parsedResponse.data;
                const entries = page.map((entry) => {
                    return {
                        id: entry.id.entry_id,
                        list_id: entry.id.list_id,
                        ...(entry.parent_record_id != null && { parent_record_id: entry.parent_record_id }),
                        ...(entry.parent_object != null && { parent_object: entry.parent_object }),
                        created_at: entry.created_at,
                        ...(entry.entry_values != null && { entry_values: entry.entry_values })
                    };
                });

                if (entries.length > 0) {
                    await nango.batchSave(entries, 'ListEntry');
                }

                if (page.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                    await nango.saveCheckpoint({ list_id: listId, offset, in_progress: true });
                }
            }
        }

        await nango.trackDeletesEnd('ListEntry');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
