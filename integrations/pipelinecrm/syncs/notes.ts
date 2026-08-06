import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const NoteSchema = z.object({
    id: z.string(),
    account_id: z.number().optional(),
    user_id: z.number().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    deal_id: z.number().optional(),
    company_id: z.number().optional(),
    person_id: z.number().optional(),
    milestone_id: z.number().optional(),
    note_category_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    primary_association_id: z.number().optional(),
    primary_association_type: z.string().optional(),
    is_sent_message: z.boolean().optional(),
    possible_notify_user_ids: z.array(z.number()).optional(),
    notify_user_ids: z.array(z.number()).optional(),
    note_category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string(),
            last_name: z.string(),
            avatar_thumb_url: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    account_id: z.number().nullish(),
    user_id: z.number().nullish(),
    title: z.string().nullish(),
    content: z.string().nullish(),
    deal_id: z.number().nullish(),
    company_id: z.number().nullish(),
    person_id: z.number().nullish(),
    milestone_id: z.number().nullish(),
    note_category_id: z.number().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    primary_association_id: z.number().nullish(),
    primary_association_type: z.string().nullish(),
    is_sent_message: z.boolean().nullish(),
    possible_notify_user_ids: z.array(z.number()).nullish(),
    notify_user_ids: z.array(z.number()).nullish(),
    note_category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .nullish(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string(),
            last_name: z.string(),
            avatar_thumb_url: z.string().nullish()
        })
        .nullish()
});

const sync = createSync({
    description: 'Sync notes (called Activities in the Pipeline CRM UI) across deals/people/companies',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter =
            checkpoint && typeof checkpoint === 'object' && 'updated_after' in checkpoint && typeof checkpoint.updated_after === 'string'
                ? checkpoint.updated_after
                : undefined;
        const isFirstRun = !updatedAfter;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');

        if (isFirstRun) {
            await nango.trackDeletesStart('Note');
        }

        const params: Record<string, string | number> = {
            per_page: 100
        };

        if (updatedAfter) {
            params['conditions%5Bactivity_modified%5D%5Bfrom_date%5D'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/notes',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            if (!Array.isArray(pageResults)) {
                throw new Error('Expected paginated results to be an array');
            }

            const notes = [];
            for (const record of pageResults) {
                const parsed = ProviderNoteSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse note: ${parsed.error.message}`);
                }

                const note = parsed.data;
                notes.push({
                    id: String(note.id),
                    ...(note.account_id !== undefined && note.account_id !== null && { account_id: note.account_id }),
                    ...(note.user_id !== undefined && note.user_id !== null && { user_id: note.user_id }),
                    ...(note.title !== undefined && note.title !== null && { title: note.title }),
                    ...(note.content !== undefined && note.content !== null && { content: note.content }),
                    ...(note.deal_id !== undefined && note.deal_id !== null && { deal_id: note.deal_id }),
                    ...(note.company_id !== undefined && note.company_id !== null && { company_id: note.company_id }),
                    ...(note.person_id !== undefined && note.person_id !== null && { person_id: note.person_id }),
                    ...(note.milestone_id !== undefined && note.milestone_id !== null && { milestone_id: note.milestone_id }),
                    ...(note.note_category_id !== undefined && note.note_category_id !== null && { note_category_id: note.note_category_id }),
                    ...(note.created_at !== undefined && note.created_at !== null && { created_at: note.created_at }),
                    ...(note.updated_at !== undefined && note.updated_at !== null && { updated_at: note.updated_at }),
                    ...(note.primary_association_id !== undefined &&
                        note.primary_association_id !== null && { primary_association_id: note.primary_association_id }),
                    ...(note.primary_association_type !== undefined &&
                        note.primary_association_type !== null && { primary_association_type: note.primary_association_type }),
                    ...(note.is_sent_message !== undefined && note.is_sent_message !== null && { is_sent_message: note.is_sent_message }),
                    ...(note.possible_notify_user_ids !== undefined &&
                        note.possible_notify_user_ids !== null && { possible_notify_user_ids: note.possible_notify_user_ids }),
                    ...(note.notify_user_ids !== undefined && note.notify_user_ids !== null && { notify_user_ids: note.notify_user_ids }),
                    ...(note.note_category !== undefined &&
                        note.note_category !== null && {
                            note_category: {
                                id: note.note_category.id,
                                name: note.note_category.name
                            }
                        }),
                    ...(note.user !== undefined &&
                        note.user !== null && {
                            user: {
                                id: note.user.id,
                                first_name: note.user.first_name,
                                last_name: note.user.last_name,
                                ...(note.user.avatar_thumb_url !== undefined &&
                                    note.user.avatar_thumb_url !== null && { avatar_thumb_url: note.user.avatar_thumb_url })
                            }
                        })
                });
            }

            if (notes.length === 0) {
                continue;
            }

            await nango.batchSave(notes, 'Note');
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Note');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
