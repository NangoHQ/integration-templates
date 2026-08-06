import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Note ID. Example: 889038936')
});

const UserSchema = z
    .object({
        id: z.number(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        avatar_thumb_url: z.string().nullable().optional()
    })
    .passthrough();

const NoteCategorySchema = z
    .object({
        id: z.number(),
        name: z.string().optional()
    })
    .passthrough();

const CommentSchema = z
    .object({
        id: z.number(),
        user_id: z.number().optional(),
        note_id: z.number().optional(),
        comment: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        edited_by_user_id: z.number().nullable().optional(),
        user: UserSchema.nullable().optional()
    })
    .passthrough();

const DocumentSchema = z
    .object({
        id: z.number(),
        title: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderNoteSchema = z
    .object({
        id: z.number(),
        content: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        deal_id: z.number().nullable().optional(),
        person_id: z.number().nullable().optional(),
        company_id: z.number().nullable().optional(),
        project_id: z.number().nullable().optional(),
        created_by_user_id: z.number().optional(),
        note_category_id: z.number().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        is_private: z.boolean().optional(),
        primary_association_type: z.string().nullable().optional(),
        primary_association_id: z.number().nullable().optional(),
        notify_user_ids: z.array(z.number()).optional(),
        user_id: z.number().optional(),
        user: UserSchema.nullable().optional(),
        created_by_user: UserSchema.nullable().optional(),
        deal: z
            .object({
                id: z.number(),
                name: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        company: z
            .object({
                id: z.number(),
                name: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        person: z
            .object({
                id: z.number(),
                name: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        project: z
            .object({
                id: z.number(),
                name: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        note_category: NoteCategorySchema.nullable().optional(),
        comments: z
            .object({
                entries: z.array(CommentSchema)
            })
            .optional(),
        documents: z.array(DocumentSchema).optional(),
        possible_notify_user_ids: z.array(z.number()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    title: z.string().optional(),
    deal_id: z.number().nullable().optional(),
    person_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    created_by_user_id: z.number().optional(),
    note_category_id: z.number().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_private: z.boolean().optional(),
    primary_association_type: z.string().optional(),
    primary_association_id: z.number().nullable().optional(),
    notify_user_ids: z.array(z.number()).optional(),
    user_id: z.number().optional(),
    user: UserSchema.nullable().optional(),
    created_by_user: UserSchema.nullable().optional(),
    deal: z
        .object({
            id: z.number(),
            name: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    company: z
        .object({
            id: z.number(),
            name: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    person: z
        .object({
            id: z.number(),
            name: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    project: z
        .object({
            id: z.number(),
            name: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    note_category: NoteCategorySchema.nullable().optional(),
    comments: z
        .object({
            entries: z.array(CommentSchema)
        })
        .optional(),
    documents: z.array(DocumentSchema).optional(),
    possible_notify_user_ids: z.array(z.number()).optional()
});

const action = createAction({
    description: 'Get a single note by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/notes/${encodeURIComponent(String(input.id))}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                id: input.id
            });
        }

        const providerNote = ProviderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            ...(providerNote.content != null && { content: providerNote.content }),
            ...(providerNote.title != null && { title: providerNote.title }),
            ...(providerNote.deal_id !== undefined && { deal_id: providerNote.deal_id }),
            ...(providerNote.person_id !== undefined && { person_id: providerNote.person_id }),
            ...(providerNote.company_id !== undefined && { company_id: providerNote.company_id }),
            ...(providerNote.project_id !== undefined && { project_id: providerNote.project_id }),
            ...(providerNote.created_by_user_id !== undefined && { created_by_user_id: providerNote.created_by_user_id }),
            ...(providerNote.note_category_id !== undefined && { note_category_id: providerNote.note_category_id }),
            ...(providerNote.created_at !== undefined && { created_at: providerNote.created_at }),
            ...(providerNote.updated_at !== undefined && { updated_at: providerNote.updated_at }),
            ...(providerNote.is_private !== undefined && { is_private: providerNote.is_private }),
            ...(providerNote.primary_association_type != null && { primary_association_type: providerNote.primary_association_type }),
            ...(providerNote.primary_association_id !== undefined && { primary_association_id: providerNote.primary_association_id }),
            ...(providerNote.notify_user_ids !== undefined && { notify_user_ids: providerNote.notify_user_ids }),
            ...(providerNote.user_id !== undefined && { user_id: providerNote.user_id }),
            ...(providerNote.user !== undefined && { user: providerNote.user }),
            ...(providerNote.created_by_user !== undefined && { created_by_user: providerNote.created_by_user }),
            ...(providerNote.deal !== undefined && { deal: providerNote.deal }),
            ...(providerNote.company !== undefined && { company: providerNote.company }),
            ...(providerNote.person !== undefined && { person: providerNote.person }),
            ...(providerNote.project !== undefined && { project: providerNote.project }),
            ...(providerNote.note_category !== undefined && { note_category: providerNote.note_category }),
            ...(providerNote.comments !== undefined && { comments: providerNote.comments }),
            ...(providerNote.documents !== undefined && { documents: providerNote.documents }),
            ...(providerNote.possible_notify_user_ids !== undefined && { possible_notify_user_ids: providerNote.possible_notify_user_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
