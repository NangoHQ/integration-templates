import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    epic_public_id: z.number().int().describe('The unique ID of the Epic. Example: 16'),
    text: z.string().describe('The comment text. Markdown is supported.')
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    text: z.string(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional(),
    app_url: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    mention_ids: z.array(z.string()).optional(),
    member_mention_ids: z.array(z.string()).optional(),
    group_mention_ids: z.array(z.string()).optional(),
    comments: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    text: z.string(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional(),
    app_url: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().optional(),
    mention_ids: z.array(z.string()).optional(),
    member_mention_ids: z.array(z.string()).optional(),
    group_mention_ids: z.array(z.string()).optional(),
    comments: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Add a comment to an epic.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#Create-Epic-Comment
            endpoint: `/api/v3/epics/${encodeURIComponent(input.epic_public_id)}/comments`,
            data: {
                text: input.text
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            text: providerComment.text,
            ...(providerComment.author_id !== undefined && { author_id: providerComment.author_id }),
            ...(providerComment.created_at !== undefined && { created_at: providerComment.created_at }),
            ...(providerComment.updated_at !== undefined && { updated_at: providerComment.updated_at }),
            ...(providerComment.deleted !== undefined && { deleted: providerComment.deleted }),
            ...(providerComment.app_url !== undefined && { app_url: providerComment.app_url }),
            ...(providerComment.entity_type !== undefined && { entity_type: providerComment.entity_type }),
            ...(providerComment.external_id !== undefined && providerComment.external_id !== null && { external_id: providerComment.external_id }),
            ...(providerComment.mention_ids !== undefined && { mention_ids: providerComment.mention_ids }),
            ...(providerComment.member_mention_ids !== undefined && { member_mention_ids: providerComment.member_mention_ids }),
            ...(providerComment.group_mention_ids !== undefined && { group_mention_ids: providerComment.group_mention_ids }),
            ...(providerComment.comments !== undefined && { comments: providerComment.comments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
