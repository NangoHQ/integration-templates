import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    attached_to: z
        .object({
            design_id: z.string().describe('The ID of the design to attach the comment to. Example: "DAHNACmCy_g"'),
            element: z.unknown().optional().describe('Reference to the specific design element to anchor the comment to')
        })
        .passthrough()
        .describe('The object to attach the comment to'),
    message_plaintext: z.string().min(1).max(2048).describe('The comment message in plaintext. Example: "Great work!"'),
    assignee_id: z.string().optional().describe('The ID of the user to assign the comment to. Example: "oUnPjZ2k2yuhftbWF7873o"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    attached_to: z
        .object({
            design_id: z.string().optional(),
            type: z.string().optional()
        })
        .passthrough()
        .optional(),
    message: z.string().optional(),
    author: ProviderUserSchema.optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    mentions: z.record(z.string(), z.unknown()).optional(),
    assignee: ProviderUserSchema.optional(),
    resolver: ProviderUserSchema.optional()
});

const ProviderResponseSchema = z.object({
    comment: ProviderCommentSchema
});

const OutputSchema = z.object({
    id: z.string(),
    design_id: z.string().optional(),
    message_plaintext: z.string().optional(),
    author: z
        .object({
            id: z.string(),
            display_name: z.string().optional()
        })
        .optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    mentions: z.record(z.string(), z.unknown()).optional(),
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
});

const action = createAction({
    description: 'Create an inline annotation comment on a specific design element',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            attached_to: input.attached_to,
            message: input.message_plaintext
        };

        if (input.assignee_id !== undefined) {
            body['assignee_id'] = input.assignee_id;
        }

        // https://www.canva.dev/docs/connect/api-reference/comments/create-comment/
        const response = await nango.post({
            endpoint: '/rest/v1/comments',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerComment = providerResponse.comment;

        return {
            id: providerComment.id,
            ...(providerComment.attached_to?.design_id !== undefined && { design_id: providerComment.attached_to.design_id }),
            ...(providerComment.message !== undefined && { message_plaintext: providerComment.message }),
            ...(providerComment.author !== undefined && {
                author: {
                    id: providerComment.author.id,
                    ...(providerComment.author.display_name !== undefined && { display_name: providerComment.author.display_name })
                }
            }),
            ...(providerComment.created_at !== undefined && { created_at: providerComment.created_at }),
            ...(providerComment.updated_at !== undefined && { updated_at: providerComment.updated_at }),
            ...(providerComment.mentions !== undefined && { mentions: providerComment.mentions }),
            ...(providerComment.assignee !== undefined && {
                assignee: {
                    id: providerComment.assignee.id,
                    ...(providerComment.assignee.display_name !== undefined && { display_name: providerComment.assignee.display_name })
                }
            }),
            ...(providerComment.resolver !== undefined && {
                resolver: {
                    id: providerComment.resolver.id,
                    ...(providerComment.resolver.display_name !== undefined && { display_name: providerComment.resolver.display_name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
