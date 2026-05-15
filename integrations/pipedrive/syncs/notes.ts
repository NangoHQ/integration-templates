import { createSync, type ProxyConfiguration } from 'nango';
import * as z from 'zod';

const NoteSchema = z.object({
    id: z.string(),
    content: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional()
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().optional(),
    project_id: z.number().optional(),
    task_id: z.number().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type Note = z.infer<typeof NoteSchema>;

const sync = createSync({
    description: 'Sync notes from Pipedrive',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/notes' }],
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Notes
            endpoint: '/v1/notes',
            params: {
                sort: 'update_time ASC',
                ...(checkpoint && 'updated_after' in checkpoint && { updated_since: checkpoint.updated_after })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerNotes = z.array(ProviderNoteSchema).safeParse(page);

            if (!providerNotes.success) {
                continue;
            }

            const notes: Note[] = providerNotes.data.map((record) => ({
                id: String(record.id),
                ...(record.content !== undefined && { content: record.content }),
                ...(record.add_time !== undefined && { add_time: record.add_time }),
                ...(record.update_time !== undefined && { update_time: record.update_time }),
                ...(record.user_id !== undefined && { user_id: record.user_id }),
                ...(record.deal_id !== undefined && { deal_id: record.deal_id }),
                ...(record.person_id !== undefined && { person_id: record.person_id }),
                ...(record.org_id !== undefined && { org_id: record.org_id }),
                ...(record.lead_id !== undefined && { lead_id: record.lead_id }),
                ...(record.project_id !== undefined && { project_id: record.project_id }),
                ...(record.task_id !== undefined && { task_id: record.task_id })
            }));

            if (notes.length === 0) {
                continue;
            }

            await nango.batchSave(notes, 'Note');

            const lastNote = notes[notes.length - 1];
            if (lastNote?.update_time) {
                await nango.saveCheckpoint({
                    updated_after: lastNote.update_time
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
