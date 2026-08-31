import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The Basecamp project ID (bucket ID).'),
        todoSetId: z.number().describe('The to-do set ID from the project\'s dock entry where name is "todoset".')
    })
    .describe('Input for retrieving a Basecamp to-do set.');

const TodoListSummarySchema = z
    .object({
        id: z.number().describe('The to-do list ID.'),
        url: z.string().describe('API URL for this to-do list.'),
        app_url: z.string().describe('Web application URL for this to-do list.'),
        title: z.string().describe('The title of the to-do list.'),
        description: z.string().nullable().optional().describe('The description of the to-do list, if any.'),
        completed_ratio: z.string().optional().describe('Ratio of completed to-dos in this list.')
    })
    .describe('Summary of a to-do list within a to-do set.');

const OutputSchema = z
    .object({
        id: z.number().describe('The to-do set ID.'),
        status: z.string().describe('The status of the to-do set, e.g. "active" or "trashed".'),
        created_at: z.string().describe('ISO 8601 timestamp when the to-do set was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the to-do set was last updated.'),
        type: z.string().describe('The resource type, typically "Todoset".'),
        url: z.string().describe('API URL for this to-do set.'),
        app_url: z.string().describe('Web application URL for this to-do set.'),
        title: z.string().describe('The title of the to-do set.'),
        todolists_count: z.number().describe('Total number of to-do lists in this set.'),
        todos_count: z.number().describe('Total number of to-dos in this set.'),
        completed_ratio: z.string().describe('Ratio of completed to-dos, e.g. "0/5".'),
        todolists: z.array(TodoListSummarySchema).describe('Summary of each to-do list in this set.'),
        todolists_url: z.string().describe('API URL to list all to-do lists in this set.'),
        todos_url: z.string().describe('API URL to list all to-dos in this set.')
    })
    .describe('Output containing a Basecamp to-do set and its to-do list summaries.');

/**
 * @tags: [read]
 * @tagReason: Reads a project's to-do set and its to-do list summaries from the Basecamp API.
 * @pitfalls: 404 responses may indicate insufficient permissions or account inactivity rather than a genuinely missing resource.
 */
const action = createAction({
    description: "Get a project's to-do set and a summary list of its to-do lists.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todosets.md
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todosets/${encodeURIComponent(input.todoSetId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'To-do set not found'
            });
        }

        const todoSet = OutputSchema.parse(response.data);
        return todoSet;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
