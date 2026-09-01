import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.union([z.number(), z.string()]).describe('The ID of the project (bucket) containing the to-do list.'),
        todolistId: z.union([z.number(), z.string()]).describe('The ID of the to-do list to update.'),
        name: z.string().describe('The new name for the to-do list. Cannot be blank.'),
        description: z.string().optional().describe('The new description for the to-do list. Omit to preserve the current description.')
    })
    .describe('Input to rename a to-do list or change its description.');

const ProviderTodolistSchema = z.object({
    id: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    name: z.string(),
    description: z.string().optional(),
    url: z.string(),
    app_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the to-do list.'),
        name: z.string().describe('Name of the to-do list.'),
        description: z.string().optional().describe('Description of the to-do list.'),
        status: z.string().describe('Status of the to-do list, e.g., active, trashed, or archived.'),
        created_at: z.string().describe('ISO 8601 timestamp when the to-do list was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the to-do list was last updated.'),
        url: z.string().describe('API URL for the to-do list.'),
        app_url: z.string().describe('App URL for the to-do list.')
    })
    .describe('The updated to-do list.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing to-do list before updating to preserve the description when it is omitted from input.
 * @pitfalls: Omitting description preserves the existing value rather than clearing it as the native API would; pass an empty string to explicitly clear it.
 */
const action = createAction({
    description: 'Rename a to-do list or change its description.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-a-to-do-list
        const getResponse = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/${encodeURIComponent(input.todolistId)}.json`,
            retries: 3
        });

        const currentTodolist = ProviderTodolistSchema.parse(getResponse.data);

        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#update-a-to-do-list
        const putResponse = await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/${encodeURIComponent(input.todolistId)}.json`,
            data: {
                name: input.name,
                description: input.description !== undefined ? input.description : currentTodolist.description
            },
            retries: 1
        });

        const updatedTodolist = ProviderTodolistSchema.parse(putResponse.data);

        return {
            id: updatedTodolist.id,
            name: updatedTodolist.name,
            ...(updatedTodolist.description !== undefined && { description: updatedTodolist.description }),
            status: updatedTodolist.status,
            created_at: updatedTodolist.created_at,
            updated_at: updatedTodolist.updated_at,
            url: updatedTodolist.url,
            app_url: updatedTodolist.app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
