import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    design_id: z.string().describe('The ID of the design to comment on. Example: "DAHNACmCy_g"'),
    message_plaintext: z.string().describe('The comment message in plaintext. Example: "Great work!"'),
    assignee_id: z.string().optional().describe('The User ID to assign the comment to. You must mention this user in the message.')
});

const ThreadSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_type: z.object({
        type: z.string(),
        content: z
            .object({
                plaintext: z.string(),
                markdown: z.string().optional()
            })
            .optional(),
        mentions: z
            .record(
                z.string(),
                z.object({
                    tag: z.string(),
                    user: z
                        .object({
                            user_id: z.string(),
                            team_id: z.string(),
                            display_name: z.string().optional()
                        })
                        .optional()
                })
            )
            .optional(),
        assignee: z
            .object({
                id: z.string(),
                display_name: z.string().optional()
            })
            .optional(),
        resolver: z
            .object({
                id: z.string(),
                display_name: z.string().optional()
            })
            .optional()
    }),
    author: z
        .object({
            id: z.string(),
            display_name: z.string().optional()
        })
        .optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = ThreadSchema;

const action = createAction({
    description: 'Create a floating comment thread on a design.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/comments/create-thread/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.design_id)}/comments`,
            data: {
                message_plaintext: input.message_plaintext,
                ...(input.assignee_id !== undefined && { assignee_id: input.assignee_id })
            },
            retries: 10
        });

        const providerResponse = z
            .object({
                thread: ThreadSchema
            })
            .parse(response.data);

        return {
            id: providerResponse.thread.id,
            design_id: providerResponse.thread.design_id,
            thread_type: providerResponse.thread.thread_type,
            author: providerResponse.thread.author,
            created_at: providerResponse.thread.created_at,
            updated_at: providerResponse.thread.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
