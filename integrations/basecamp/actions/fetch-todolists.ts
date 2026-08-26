import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Basecamp project ID (bucket ID). Example: "48644099"'),
        todoSetId: z.string().describe('Basecamp to-do set ID within the project. Example: "10239340934"'),
        status: z.enum(['active', 'archived', 'trashed']).optional().describe('Filter by status. Defaults to active if omitted.')
    })
    .describe("Input for fetching to-do lists from a project's to-do set.");

const ProviderTodolistSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        visible_to_clients: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        title: z.string(),
        inherits_status: z.boolean(),
        type: z.string(),
        url: z.string(),
        app_url: z.string(),
        bookmark_url: z.string(),
        subscription_url: z.string(),
        comments_count: z.number(),
        comments_url: z.string(),
        boosts_count: z.number(),
        boosts_url: z.string(),
        position: z.number(),
        parent: z.object({
            id: z.number(),
            title: z.string(),
            type: z.string(),
            url: z.string(),
            app_url: z.string()
        }),
        bucket: z.object({
            id: z.number(),
            name: z.string(),
            type: z.string()
        }),
        creator: z
            .object({
                id: z.number(),
                name: z.string(),
                email_address: z.string().optional()
            })
            .passthrough(),
        description: z.string(),
        description_attachments: z.array(z.unknown()),
        completed: z.boolean(),
        completed_ratio: z.string(),
        name: z.string(),
        color: z.string().nullable(),
        groups_url: z.string(),
        todos_url: z.string(),
        app_todos_url: z.string(),
        comments_app_url: z.string()
    })
    .passthrough();

const TodolistOutputSchema = z
    .object({
        id: z.number().describe('Basecamp to-do list ID.'),
        status: z.string().describe('Current status: active, archived, or trashed.'),
        visible_to_clients: z.boolean().describe('Whether the list is visible to client users.'),
        created_at: z.string().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().describe('ISO 8601 last-update timestamp.'),
        title: z.string().describe('Display title of the to-do list.'),
        name: z.string().describe('Name of the to-do list.'),
        completed: z.boolean().describe('Whether the list is marked as completed.'),
        completed_ratio: z.string().describe('Fraction of completed to-dos, e.g. "2/5".'),
        description: z.string().describe('HTML description of the to-do list.'),
        color: z.string().optional().describe('Color label of the list, if any.'),
        url: z.string().describe('API URL for this to-do list.'),
        app_url: z.string().describe('Basecamp web-app URL for this to-do list.'),
        todos_url: z.string().describe('API URL for the to-dos in this list.'),
        comments_count: z.number().describe('Number of comments on this list.'),
        comments_url: z.string().describe('API URL for comments on this list.'),
        position: z.number().describe('Position/order of the list within its to-do set.')
    })
    .describe('A single Basecamp to-do list.');

const OutputSchema = z
    .object({
        lists: z.array(TodolistOutputSchema).describe('All to-do lists found in the to-do set.')
    })
    .describe('Output for fetch-todolists containing all to-do lists.');

/**
 * @tags: [read]
 * @tagReason: This action only reads to-do lists from the Basecamp API.
 * @pitfalls: A 404 response can indicate insufficient permissions or an inactive account (check for a Reason: Account Inactive header), not only a missing record.
 */
const action = createAction({
    description: "Fetch all to-do lists in a project's to-do set.",
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const params: Record<string, string> = {};
        if (input.status !== undefined) {
            params['status'] = input.status;
        }

        const lists: z.infer<typeof TodolistOutputSchema>[] = [];

        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
        for await (const page of nango.paginate({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todosets/${encodeURIComponent(input.todoSetId)}/todolists.json`,
            params,
            retries: 3,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            }
        })) {
            const pageData = z.array(ProviderTodolistSchema).safeParse(page);
            if (!pageData.success) {
                throw new Error('Invalid to-do list response from provider');
            }
            for (const list of pageData.data) {
                lists.push({
                    id: list.id,
                    status: list.status,
                    visible_to_clients: list.visible_to_clients,
                    created_at: list.created_at,
                    updated_at: list.updated_at,
                    title: list.title,
                    name: list.name,
                    completed: list.completed,
                    completed_ratio: list.completed_ratio,
                    description: list.description,
                    ...(list.color !== null && { color: list.color }),
                    url: list.url,
                    app_url: list.app_url,
                    todos_url: list.todos_url,
                    comments_count: list.comments_count,
                    comments_url: list.comments_url,
                    position: list.position
                });
            }
        }

        return { lists };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
