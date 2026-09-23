import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderNoteSchema = z.object({
    id: z.union([z.string(), z.number()]),
    relid: z.union([z.string(), z.number()]).optional().nullable(),
    reltype: z.string().optional().nullable(),
    userid: z.union([z.string(), z.number()]).optional().nullable(),
    is_draft: z.union([z.string(), z.number()]).optional().nullable(),
    cdate: z.string().optional().nullable(),
    mdate: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    user: z.union([z.string(), z.number()]).optional().nullable()
});

const NoteSchema = z.object({
    id: z.string(),
    relid: z.string().optional(),
    reltype: z.string().optional(),
    userid: z.string().optional(),
    is_draft: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    note: z.string().optional(),
    user: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync notes from ActiveCampaign.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },
    // https://developers.activecampaign.com/reference/retrieve-list-of-all-notes
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/notes'
        }
    ],

    exec: async (nango) => {
        // Blocker: GET /3/notes does not document any changed-since filter,
        // cursor, or ordering parameter, so this sync must do a full refresh.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        let offset = checkpointResult.success ? checkpointResult.data.offset : 0;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Note');

        // https://developers.activecampaign.com/reference/retrieve-list-of-all-notes
        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-list-of-all-notes
            endpoint: '/3/notes',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'notes'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedPage = z.array(ProviderNoteSchema).parse(page);

            const notes = validatedPage.map((record) => ({
                id: String(record.id),
                ...(record.relid != null && { relid: String(record.relid) }),
                ...(record.reltype != null && { reltype: record.reltype }),
                ...(record.userid != null && { userid: String(record.userid) }),
                ...(record.is_draft != null && { is_draft: String(record.is_draft) }),
                ...(record.cdate != null && { cdate: record.cdate }),
                ...(record.mdate != null && { mdate: record.mdate }),
                ...(record.note != null && { note: record.note }),
                ...(record.user != null && { user: String(record.user) })
            }));

            if (notes.length > 0) {
                await nango.batchSave(notes, 'Note');
            }

            offset += validatedPage.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Note');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
