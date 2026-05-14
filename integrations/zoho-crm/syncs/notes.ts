import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const _ZohoNoteSchema = z.object({
    id: z.string(),
    Note_Title: z.string().optional(),
    Note_Content: z.string().optional(),
    Parent_Id: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    se_module: z.string().optional(),
    Owner: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    Created_By: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    Modified_By: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const NoteSchema = z.object({
    id: z.string(),
    note_title: z.string().optional(),
    note_content: z.string().optional(),
    parent_id: z.string().optional(),
    parent_name: z.string().optional(),
    parent_module: z.string().optional(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    owner_email: z.string().optional(),
    created_by_id: z.string().optional(),
    created_by_name: z.string().optional(),
    modified_by_id: z.string().optional(),
    modified_by_name: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type ZohoNote = z.infer<typeof _ZohoNoteSchema>;

const sync = createSync({
    description: 'Sync notes from Zoho CRM',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/notes'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const headers: Record<string, string> = {};

        if (checkpoint?.updated_after) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/Notes/get-notes.html
            endpoint: '/crm/v2/Notes',
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
            params: {
                sort_by: 'Modified_Time',
                sort_order: 'asc',
                per_page: '200'
            },
            // https://www.zoho.com/crm/developer/docs/api/v2/Notes/get-notes.html
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        let lastModifiedTime: string | undefined;

        for await (const notes of nango.paginate<ZohoNote>(proxyConfig)) {
            const mappedNotes = notes.map((note) => ({
                id: note.id,
                ...(note.Note_Title && { note_title: note.Note_Title }),
                ...(note.Note_Content && { note_content: note.Note_Content }),
                ...(note.Parent_Id?.id && { parent_id: note.Parent_Id.id }),
                ...(note.Parent_Id?.name && { parent_name: note.Parent_Id.name }),
                ...(note.se_module && { parent_module: note.se_module }),
                ...(note.Owner?.id && { owner_id: note.Owner.id }),
                ...(note.Owner?.name && { owner_name: note.Owner.name }),
                ...(note.Owner?.email && { owner_email: note.Owner.email }),
                ...(note.Created_By?.id && { created_by_id: note.Created_By.id }),
                ...(note.Created_By?.name && { created_by_name: note.Created_By.name }),
                ...(note.Modified_By?.id && { modified_by_id: note.Modified_By.id }),
                ...(note.Modified_By?.name && { modified_by_name: note.Modified_By.name }),
                ...(note.Created_Time && { created_time: note.Created_Time }),
                ...(note.Modified_Time && { modified_time: note.Modified_Time })
            }));

            if (mappedNotes.length > 0) {
                await nango.batchSave(mappedNotes, 'Note');

                for (const note of notes) {
                    if (note.Modified_Time) {
                        if (lastModifiedTime === undefined || note.Modified_Time > lastModifiedTime) {
                            lastModifiedTime = note.Modified_Time;
                        }
                    }
                }
            }
        }

        if (lastModifiedTime) {
            await nango.saveCheckpoint({ updated_after: lastModifiedTime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
