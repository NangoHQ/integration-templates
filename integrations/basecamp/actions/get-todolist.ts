import { z } from 'zod';
import { createAction } from 'nango';

const ParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string()
});

const BucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    url: z.string().optional(),
    app_url: z.string().optional()
});

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable(),
    avatar_url: z.string()
});

const ProviderTodolistSchema = z.object({
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
    bubble_up_url: z.string(),
    position: z.number(),
    parent: ParentSchema,
    bucket: BucketSchema,
    creator: CreatorSchema,
    description: z.string(),
    description_attachments: z.array(z.unknown()),
    completed: z.boolean(),
    completed_ratio: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    groups_url: z.string().optional(),
    group_position_url: z.string().optional(),
    todos_url: z.string(),
    app_todos_url: z.string(),
    comments_app_url: z.string()
});

const InputSchema = z
    .object({
        project_id: z.number().describe('The ID of the project (bucket) that contains the to-do list. Example: 48644099'),
        todolist_id: z.number().describe('The ID of the to-do list to retrieve. Example: 10239437840')
    })
    .describe('Input for retrieving a single Basecamp to-do list.');

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the to-do list.'),
        status: z.string().describe('The status of the to-do list.'),
        visible_to_clients: z.boolean().describe('Whether the to-do list is visible to clients.'),
        created_at: z.string().describe('The creation timestamp of the to-do list.'),
        updated_at: z.string().describe('The last update timestamp of the to-do list.'),
        title: z.string().describe('The title of the to-do list.'),
        type: z.string().describe('The type of the resource.'),
        url: z.string().describe('The API URL of the to-do list.'),
        app_url: z.string().describe('The app URL of the to-do list.'),
        position: z.number().describe('The position of the to-do list within its parent.'),
        description: z.string().describe('The description of the to-do list.'),
        completed: z.boolean().describe('Whether the to-do list is completed.'),
        completed_ratio: z.string().describe('The completion ratio of the to-do list.'),
        name: z.string().describe('The name of the to-do list.'),
        color: z.string().nullable().describe('The color of the to-do list.'),
        comments_count: z.number().describe('The number of comments on the to-do list.'),
        comments_url: z.string().describe('The URL for comments on the to-do list.'),
        groups_url: z.string().optional().describe('The URL for groups in this to-do list. Present only for a regular to-do list, not a to-do-list group.'),
        group_position_url: z
            .string()
            .optional()
            .describe('The URL to reposition this to-do-list group. Present only when this record is a to-do-list group, not a regular to-do list.'),
        todos_url: z.string().describe('The URL for to-dos in this to-do list.'),
        parent: z
            .object({
                id: z.number().describe('The ID of the parent resource.'),
                title: z.string().describe('The title of the parent resource.'),
                type: z.string().describe('The type of the parent resource.'),
                url: z.string().describe('The API URL of the parent resource.'),
                app_url: z.string().describe('The app URL of the parent resource.')
            })
            .describe('The parent resource of the to-do list.'),
        bucket: z
            .object({
                id: z.number().describe('The ID of the project bucket.'),
                name: z.string().describe('The name of the project bucket.'),
                type: z.string().describe('The type of the bucket.'),
                url: z.string().optional().describe('The API URL of the bucket.'),
                app_url: z.string().optional().describe('The app URL of the bucket.')
            })
            .describe('The project bucket containing the to-do list.'),
        creator: z
            .object({
                id: z.number().describe('The ID of the creator.'),
                name: z.string().describe('The name of the creator.'),
                email_address: z.string().optional().describe('The email address of the creator, omitted if the creator has no email address.'),
                avatar_url: z.string().describe('The avatar URL of the creator.')
            })
            .describe('The creator of the to-do list.')
    })
    .describe('Output representing a single Basecamp to-do list.');

/**
 * @tags: [read]
 * @tagReason: Reads a single to-do list from the Basecamp API.
 * @pitfalls: The returned to-do list may actually be a to-do-list group, distinguishable only because its parent is another Todolist rather than a Todoset.
 */
const action = createAction({
    description: 'Get a single to-do list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-a-to-do-list
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.project_id)}/todolists/${encodeURIComponent(input.todolist_id)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'To-do list not found',
                project_id: input.project_id,
                todolist_id: input.todolist_id
            });
        }

        const todolist = ProviderTodolistSchema.parse(response.data);

        return {
            id: todolist.id,
            status: todolist.status,
            visible_to_clients: todolist.visible_to_clients,
            created_at: todolist.created_at,
            updated_at: todolist.updated_at,
            title: todolist.title,
            type: todolist.type,
            url: todolist.url,
            app_url: todolist.app_url,
            position: todolist.position,
            description: todolist.description,
            completed: todolist.completed,
            completed_ratio: todolist.completed_ratio,
            name: todolist.name,
            color: todolist.color,
            comments_count: todolist.comments_count,
            comments_url: todolist.comments_url,
            ...(todolist.groups_url !== undefined && { groups_url: todolist.groups_url }),
            ...(todolist.group_position_url !== undefined && { group_position_url: todolist.group_position_url }),
            todos_url: todolist.todos_url,
            parent: todolist.parent,
            bucket: todolist.bucket,
            creator: {
                id: todolist.creator.id,
                name: todolist.creator.name,
                ...(todolist.creator.email_address != null && { email_address: todolist.creator.email_address }),
                avatar_url: todolist.creator.avatar_url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
