import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// The account-scoped Basecamp API host. Pagination cursors are only ever trusted when they resolve to this origin,
// so a caller-supplied cursor cannot redirect the authenticated request to an arbitrary host.
const BASECAMP_API_ORIGIN = 'https://3.basecampapi.com';

const ProviderPersonSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        email_address: z.string().nullable()
    })
    .passthrough();

const ProviderTodoSchema = z
    .object({
        id: z.number(),
        content: z.string(),
        completed: z.boolean(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        due_on: z.string().nullable().optional(),
        starts_on: z.string().nullable().optional(),
        assignees: z.array(ProviderPersonSchema),
        description: z.string(),
        position: z.number(),
        url: z.string(),
        app_url: z.string(),
        comments_count: z.number(),
        creator: ProviderPersonSchema
    })
    .passthrough();

const PersonSchema = z.object({
    id: z.number().describe('The unique ID of the person.'),
    name: z.string().describe('The full name of the person.'),
    email_address: z.string().nullable().describe('The email address of the person, or null if they have none.')
});

const TodoSchema = z.object({
    id: z.number().describe('The unique ID of the to-do.'),
    content: z.string().describe('The content or title of the to-do.'),
    completed: z.boolean().describe('Whether the to-do has been marked as completed.'),
    status: z.string().describe('The recording status: active, archived, or trashed.'),
    created_at: z.string().describe('The ISO 8601 timestamp when the to-do was created.'),
    updated_at: z.string().describe('The ISO 8601 timestamp when the to-do was last updated.'),
    due_on: z.string().nullable().optional().describe('The due date of the to-do, or null if not set.'),
    starts_on: z.string().nullable().optional().describe('The start date of the to-do, or null if not set.'),
    assignees: z.array(PersonSchema).describe('People assigned to the to-do.'),
    description: z.string().describe('The description of the to-do in HTML.'),
    position: z.number().describe('The position of the to-do within its list.'),
    url: z.string().describe('The canonical API URL of the to-do.'),
    app_url: z.string().describe('The Basecamp app URL of the to-do.'),
    comments_count: z.number().describe('The number of comments on the to-do.'),
    creator: PersonSchema.describe('The person who created the to-do.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the to-do list.'),
        todoListId: z.number().describe('The ID of the to-do list to query.'),
        cursor: z.string().optional().describe('Pagination cursor from the `next_cursor` field of a previous response. Omit for the first page.'),
        status: z.enum(['archived', 'trashed']).optional().describe('Filter by status. When omitted, only active to-dos are returned.'),
        completed: z.boolean().optional().describe('When true, only return completed to-dos. Can be combined with `status`.')
    })
    .describe('Input for listing to-dos in a Basecamp to-do list.');

const OutputSchema = z
    .object({
        todos: z.array(TodoSchema).describe('The list of to-dos matching the filter criteria.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Pass this to the `cursor` input to fetch the next page.')
    })
    .describe('Output containing the list of to-dos and an optional pagination cursor.');

function parseLinkHeader(header: string | undefined): Record<string, string> {
    if (!header) {
        return {};
    }
    const links: Record<string, string> = {};
    const parts = header.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match && match[1] && match[2]) {
            links[match[2]] = match[1];
        }
    }
    return links;
}

/**
 * @tags: [read]
 * @tagReason: Reads to-do items from a Basecamp to-do list.
 * @pitfalls: Without filters, only active pending (not completed) to-dos are returned; archived or trashed status includes both pending and completed items.
 */
const action = createAction({
    description: 'List active (non-completed) to-dos in a to-do list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['full'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-to-dos
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/${encodeURIComponent(input.todoListId)}/todos.json`,
            retries: 3
        };

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            if (cursorUrl.origin !== BASECAMP_API_ORIGIN) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The cursor does not point to the Basecamp API host.'
                });
            }
            config.baseUrlOverride = cursorUrl.origin;
            config.endpoint = cursorUrl.pathname + cursorUrl.search;
        } else {
            config.params = {
                ...(input.status && { status: input.status }),
                ...(input.completed !== undefined && { completed: input.completed.toString() })
            };
        }

        const response = await nango.get(config);

        const linkHeader = response.headers['link'] || response.headers['Link'];
        const links = parseLinkHeader(linkHeader);
        const nextUrl = links['next'];

        const providerTodos = z.array(ProviderTodoSchema).parse(response.data);

        return {
            todos: providerTodos.map((todo) => ({
                id: todo.id,
                content: todo.content,
                completed: todo.completed,
                status: todo.status,
                created_at: todo.created_at,
                updated_at: todo.updated_at,
                due_on: todo.due_on,
                starts_on: todo.starts_on,
                assignees: todo.assignees.map((assignee) => ({
                    id: assignee.id,
                    name: assignee.name,
                    email_address: assignee.email_address
                })),
                description: todo.description,
                position: todo.position,
                url: todo.url,
                app_url: todo.app_url,
                comments_count: todo.comments_count,
                creator: {
                    id: todo.creator.id,
                    name: todo.creator.name,
                    email_address: todo.creator.email_address
                }
            })),
            ...(nextUrl && { next_cursor: nextUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
