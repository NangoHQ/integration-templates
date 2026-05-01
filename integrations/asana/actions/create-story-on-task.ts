import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().min(1).describe('The task to operate on. Example: "123456789"'),
    text: z.string().optional().describe('The plain text of the comment to add. Cannot be used with html_text.'),
    html_text: z.string().optional().describe('HTML formatted text for a comment. Cannot be used with text.')
});

const ProviderStorySchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    created_at: z.string().optional(),
    resource_subtype: z.string().optional(),
    text: z.string().optional().nullable(),
    html_text: z.string().optional().nullable(),
    is_pinned: z.boolean().optional().nullable(),
    type: z.string().optional().nullable()
});

const AsanaResponseSchema = z.object({
    data: ProviderStorySchema
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    created_at: z.string().optional(),
    resource_subtype: z.string().optional(),
    text: z.string().optional(),
    html_text: z.string().optional(),
    is_pinned: z.boolean().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Create a comment or story entry on a task.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-story-on-task',
        group: 'Stories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['stories:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.text !== undefined && input.html_text !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of text or html_text may be provided, not both.'
            });
        }

        if (input.text === undefined && input.html_text === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either text or html_text must be provided.'
            });
        }

        const response = await nango.post({
            // https://developers.asana.com/reference/createstoryfortask
            endpoint: `/api/1.0/tasks/${encodeURIComponent(input.task_gid)}/stories`,
            data: {
                data: {
                    ...(input.text !== undefined && { text: input.text }),
                    ...(input.html_text !== undefined && { html_text: input.html_text })
                }
            },
            retries: 10
        });

        const providerResponse = AsanaResponseSchema.parse(response.data);
        const story = providerResponse.data;

        return {
            gid: story.gid,
            resource_type: story.resource_type,
            ...(story.created_at !== undefined && { created_at: story.created_at }),
            ...(story.resource_subtype !== undefined && { resource_subtype: story.resource_subtype }),
            ...(story.text != null && { text: story.text }),
            ...(story.html_text != null && { html_text: story.html_text }),
            ...(story.is_pinned != null && { is_pinned: story.is_pinned }),
            ...(story.type != null && { type: story.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
