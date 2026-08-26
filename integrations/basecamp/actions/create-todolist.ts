import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) that contains the to-do set.'),
        todoSetId: z.number().describe('The ID of the to-do set under which the new to-do list will be created.'),
        name: z.string().describe('The name of the new to-do list.'),
        description: z.string().optional().describe('Optional rich-text description of the to-do list.'),
        visibleToClients: z.boolean().optional().describe('Whether the to-do list is visible to clients. Defaults to false.')
    })
    .describe('Input for creating a new to-do list under a Basecamp project to-do set.');

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
    creator: z.object({
        id: z.number(),
        attachable_sgid: z.string(),
        name: z.string(),
        personable_type: z.string(),
        title: z.string().nullable(),
        tagline: z.string().nullable(),
        location: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        email_address: z.string().nullable(),
        bio: z.string().nullable(),
        admin: z.boolean(),
        owner: z.boolean(),
        client: z.boolean(),
        employee: z.boolean(),
        time_zone: z.string(),
        avatar_url: z.string(),
        company: z
            .object({
                id: z.number(),
                name: z.string()
            })
            .optional(),
        can_ping: z.boolean(),
        can_manage_projects: z.boolean(),
        can_manage_people: z.boolean(),
        can_access_timesheet: z.boolean(),
        can_access_hill_charts: z.boolean()
    }),
    description: z.string(),
    description_attachments: z.array(z.unknown()),
    completed: z.boolean(),
    completed_ratio: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    groups_url: z.string().optional(),
    todos_url: z.string().optional(),
    app_todos_url: z.string(),
    comments_app_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the created to-do list.'),
        status: z.string().describe('The status of the to-do list, e.g. "active".'),
        visible_to_clients: z.boolean().describe('Whether the to-do list is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the to-do list was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the to-do list was last updated.'),
        title: z.string().describe('The display title of the to-do list.'),
        inherits_status: z.boolean().describe('Whether the to-do list inherits its parent status.'),
        type: z.string().describe('The Basecamp type, always "Todolist".'),
        url: z.string().describe('The API URL of the to-do list.'),
        app_url: z.string().describe('The Basecamp app URL of the to-do list.'),
        bookmark_url: z.string().describe('The bookmark URL for the to-do list.'),
        subscription_url: z.string().describe('The subscription URL for the to-do list.'),
        comments_count: z.number().describe('The number of comments on the to-do list.'),
        comments_url: z.string().describe('The API URL for comments on the to-do list.'),
        boosts_count: z.number().describe('The number of boosts on the to-do list.'),
        boosts_url: z.string().describe('The API URL for boosts on the to-do list.'),
        position: z.number().describe('The position of the to-do list within its to-do set.'),
        parent: z
            .object({
                id: z.number().describe('The ID of the parent to-do set.'),
                title: z.string().describe('The title of the parent to-do set.'),
                type: z.string().describe('The type of the parent, e.g. "Todoset".'),
                url: z.string().describe('The API URL of the parent to-do set.'),
                app_url: z.string().describe('The app URL of the parent to-do set.')
            })
            .describe('The parent to-do set containing this list.'),
        bucket: z
            .object({
                id: z.number().describe('The ID of the project bucket.'),
                name: z.string().describe('The name of the project bucket.'),
                type: z.string().describe('The type of the bucket, e.g. "Project".')
            })
            .describe('The project bucket that contains this to-do list.'),
        creator: z
            .object({
                id: z.number().describe('The ID of the creator.'),
                attachable_sgid: z.string().describe('The attachable SGID of the creator.'),
                name: z.string().describe('The full name of the creator.'),
                personable_type: z.string().describe('The personable type of the creator, e.g. "User".'),
                title: z.string().nullable().describe('The job title of the creator.'),
                tagline: z.string().nullable().describe('The tagline of the creator.'),
                location: z.string().nullable().describe('The location of the creator.'),
                created_at: z.string().describe('ISO 8601 timestamp when the creator account was created.'),
                updated_at: z.string().describe('ISO 8601 timestamp when the creator was last updated.'),
                email_address: z.string().nullable().describe('The email address of the creator.'),
                bio: z.string().nullable().describe('The bio of the creator.'),
                admin: z.boolean().describe('Whether the creator is an admin.'),
                owner: z.boolean().describe('Whether the creator is an owner.'),
                client: z.boolean().describe('Whether the creator is a client.'),
                employee: z.boolean().describe('Whether the creator is an employee.'),
                time_zone: z.string().describe('The time zone of the creator.'),
                avatar_url: z.string().describe('The avatar URL of the creator.'),
                company: z
                    .object({
                        id: z.number().describe('The ID of the creator company.'),
                        name: z.string().describe('The name of the creator company.')
                    })
                    .optional()
                    .describe('The company of the creator, if the person belongs to one.'),
                can_ping: z.boolean().describe('Whether the creator can be pinged.'),
                can_manage_projects: z.boolean().describe('Whether the creator can manage projects.'),
                can_manage_people: z.boolean().describe('Whether the creator can manage people.'),
                can_access_timesheet: z.boolean().describe('Whether the creator can access timesheets.'),
                can_access_hill_charts: z.boolean().describe('Whether the creator can access hill charts.')
            })
            .describe('The user who created the to-do list.'),
        description: z.string().describe('The rich-text description of the to-do list.'),
        description_attachments: z.array(z.unknown()).describe('Attachments embedded in the description.'),
        completed: z.boolean().describe('Whether the to-do list is marked as completed.'),
        completed_ratio: z.string().describe('The ratio of completed to total to-dos, e.g. "0/0".'),
        name: z.string().describe('The name of the to-do list.'),
        color: z.string().nullable().describe('The color of the to-do list.'),
        groups_url: z.string().optional().describe('The API URL for to-do list groups under this list.'),
        todos_url: z.string().optional().describe('The API URL for to-dos under this list.'),
        app_todos_url: z.string().describe('The app URL for to-dos under this list.'),
        comments_app_url: z.string().describe('The app URL for comments on this to-do list.')
    })
    .describe('The newly created Basecamp to-do list, including its parent, bucket, and creator details.');

/**
 * @tags: [write]
 * @tagReason: Creates a new to-do list under a project to-do set via a POST request.
 */
const action = createAction({
    description: 'Create a to-do list under a project to-do set.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#create-a-to-do-list
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/todosets/${encodeURIComponent(String(input.todoSetId))}/todolists.json`,
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.visibleToClients !== undefined && { visible_to_clients: input.visibleToClients })
            },
            retries: 3
        });

        const providerTodolist = ProviderTodolistSchema.parse(response.data);

        return {
            id: providerTodolist.id,
            status: providerTodolist.status,
            visible_to_clients: providerTodolist.visible_to_clients,
            created_at: providerTodolist.created_at,
            updated_at: providerTodolist.updated_at,
            title: providerTodolist.title,
            inherits_status: providerTodolist.inherits_status,
            type: providerTodolist.type,
            url: providerTodolist.url,
            app_url: providerTodolist.app_url,
            bookmark_url: providerTodolist.bookmark_url,
            subscription_url: providerTodolist.subscription_url,
            comments_count: providerTodolist.comments_count,
            comments_url: providerTodolist.comments_url,
            boosts_count: providerTodolist.boosts_count,
            boosts_url: providerTodolist.boosts_url,
            position: providerTodolist.position,
            parent: providerTodolist.parent,
            bucket: providerTodolist.bucket,
            creator: providerTodolist.creator,
            description: providerTodolist.description,
            description_attachments: providerTodolist.description_attachments,
            completed: providerTodolist.completed,
            completed_ratio: providerTodolist.completed_ratio,
            name: providerTodolist.name,
            color: providerTodolist.color,
            ...(providerTodolist.groups_url !== undefined && { groups_url: providerTodolist.groups_url }),
            ...(providerTodolist.todos_url !== undefined && { todos_url: providerTodolist.todos_url }),
            app_todos_url: providerTodolist.app_todos_url,
            comments_app_url: providerTodolist.comments_app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
