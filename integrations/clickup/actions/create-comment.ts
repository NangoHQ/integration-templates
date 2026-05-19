import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().optional().describe('ClickUp Task ID to comment on. Example: "86c9w2nke"'),
    list_id: z.string().optional().describe('ClickUp List ID to comment on. Example: "901523451693"'),
    comment_text: z.string().describe('The text content of the comment'),
    notify_all: z.boolean().optional().describe('Whether to notify all watchers')
});

const ProviderResponseSchema = z.object({
    id: z.number(),
    hist_id: z.string(),
    date: z.number().describe('Unix timestamp in milliseconds')
});

const OutputSchema = z.object({
    id: z.string().describe('Comment ID as string'),
    hist_id: z.string(),
    date: z.number().describe('Unix timestamp in milliseconds')
});

const action = createAction({
    description: 'Create a comment in ClickUp on a task or list',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.task_id && !input.list_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either task_id or list_id must be provided'
            });
        }

        if (input.task_id && input.list_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Cannot provide both task_id and list_id. Provide only one.'
            });
        }

        const listId = input.list_id;
        let endpoint: string;
        if (input.task_id) {
            endpoint = `/api/v2/task/${encodeURIComponent(input.task_id)}/comment`;
        } else if (listId) {
            endpoint = `/api/v2/list/${encodeURIComponent(listId)}/comment`;
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either task_id or list_id must be provided'
            });
        }

        // https://developer.clickup.com/reference/create-task-comment
        // https://developer.clickup.com/reference/create-list-comment
        const response = await nango.post({
            endpoint: endpoint,
            data: {
                comment_text: input.comment_text,
                ...(input.notify_all !== undefined && { notify_all: input.notify_all })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create comment: empty response from API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: String(providerResponse.id),
            hist_id: providerResponse.hist_id,
            date: providerResponse.date
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
