import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    design_id: z.string().describe('The ID of the design. Example: "DAFVztcvd9z"'),
    thread_id: z.string().describe('The ID of the comment thread. Example: "KeAbiEAjZEj"')
});

const UserSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const UserMentionSchema = z.object({
    tag: z.string(),
    user: z
        .object({
            user_id: z.string().optional(),
            team_id: z.string().optional(),
            display_name: z.string().optional()
        })
        .optional()
});

const CommentContentSchema = z.object({
    plaintext: z.string(),
    markdown: z.string().optional()
});

const CommentThreadTypeSchema = z.object({
    type: z.literal('comment'),
    content: CommentContentSchema,
    mentions: z.record(z.string(), UserMentionSchema).optional(),
    assignee: UserSchema.optional(),
    resolver: UserSchema.optional()
});

const SuggestedEditSchema = z.object({
    type: z.enum(['add', 'delete', 'format']),
    format: z.string().optional()
});

const SuggestionThreadTypeSchema = z.object({
    type: z.literal('suggestion'),
    suggested_edits: z.array(SuggestedEditSchema),
    status: z.enum(['open', 'accepted', 'rejected'])
});

const ThreadTypeSchema = z.union([CommentThreadTypeSchema, SuggestionThreadTypeSchema]);

const ThreadSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_type: ThreadTypeSchema,
    author: UserSchema.optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z.object({
    thread: ThreadSchema
});

const action = createAction({
    description: 'Retrieve a design comment thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.canva.dev/docs/connect/api-reference/comments/get-thread/
        const response = await nango.get({
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.design_id)}/comments/${encodeURIComponent(input.thread_id)}`,
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Canva API.'
            });
        }

        const parsed = OutputSchema.safeParse(data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid thread data in response.',
                details: parsed.error.message
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
