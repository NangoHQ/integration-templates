import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the project that contains the to-do list.'),
        todoListId: z.string().describe('The ID of the to-do list to create the group within.'),
        name: z.string().describe('The name of the to-do list group.'),
        color: z
            .enum(['white', 'red', 'orange', 'yellow', 'green', 'blue', 'aqua', 'purple', 'gray', 'pink', 'brown'])
            .optional()
            .describe('The color of the group.')
    })
    .describe('Input for creating a to-do list group.');

const ParentSchema = z
    .object({
        id: z.number().describe('The ID of the parent resource.'),
        title: z.string().describe('The title of the parent resource.'),
        type: z.string().describe('The type of the parent resource.'),
        url: z.string().describe('The API URL of the parent resource.'),
        app_url: z.string().describe('The app URL of the parent resource.')
    })
    .describe('Parent to-do list reference.');

const BucketSchema = z
    .object({
        id: z.number().describe('The ID of the project bucket.'),
        name: z.string().describe('The name of the project bucket.'),
        type: z.string().describe('The type of the bucket resource.')
    })
    .describe('Project bucket reference.');

const CreatorSchema = z
    .object({
        id: z.number().describe('The ID of the creator.'),
        name: z.string().describe('The name of the creator.'),
        email_address: z.string().optional().describe('The email address of the creator.'),
        avatar_url: z.string().optional().describe('The avatar URL of the creator.')
    })
    .describe('Creator reference.');

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the created to-do list group.'),
        status: z.string().describe('The status of the group.'),
        visible_to_clients: z.boolean().describe('Whether the group is visible to clients.'),
        created_at: z.string().describe('The creation timestamp of the group.'),
        updated_at: z.string().describe('The last updated timestamp of the group.'),
        title: z.string().describe('The title of the group.'),
        inherits_status: z.boolean().describe('Whether the group inherits its status from its parent.'),
        type: z.string().describe('The resource type of the group.'),
        url: z.string().describe('The API URL of the group.'),
        app_url: z.string().describe('The app URL of the group.'),
        bookmark_url: z.string().describe('The bookmark URL of the group.'),
        subscription_url: z.string().describe('The subscription URL of the group.'),
        comments_count: z.number().describe('The number of comments on the group.'),
        comments_url: z.string().describe('The comments API URL of the group.'),
        boosts_count: z.number().describe('The number of boosts on the group.'),
        boosts_url: z.string().describe('The boosts API URL of the group.'),
        position: z.number().describe('The position of the group within its parent.'),
        parent: ParentSchema.describe('The parent to-do list.'),
        bucket: BucketSchema.describe('The project bucket containing the group.'),
        creator: CreatorSchema.describe('The person who created the group.'),
        description: z.string().describe('The description of the group.'),
        description_attachments: z.array(z.unknown()).describe('Attachments in the group description.'),
        completed: z.boolean().describe('Whether the group is marked as completed.'),
        completed_ratio: z.string().describe('The completion ratio of the group.'),
        name: z.string().describe('The name of the group.'),
        color: z.string().optional().describe('The color of the group.'),
        group_position_url: z.string().describe('The API URL to reposition the group.'),
        todos_url: z.string().describe('The API URL for the group to-dos.'),
        app_todos_url: z.string().describe('The app URL for the group to-dos.'),
        comments_app_url: z.string().describe('The app URL for the group comments.')
    })
    .describe('Output of a created to-do list group.');

const ProviderGroupSchema = z.object({
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
        name: z.string(),
        email_address: z.string().optional(),
        avatar_url: z.string().optional()
    }),
    description: z.string(),
    description_attachments: z.array(z.unknown()),
    completed: z.boolean(),
    completed_ratio: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    group_position_url: z.string(),
    todos_url: z.string(),
    app_todos_url: z.string(),
    comments_app_url: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new to-do list group in the provider.
 * @pitfalls: Created groups are returned as Todolist-typed objects with type 'Todolist' and group_position_url as the only distinguishing field.
 */
const action = createAction({
    description: 'Create a group (section) within a to-do list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/todolist_groups.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todolists/${encodeURIComponent(input.todoListId)}/groups.json`,
            data: {
                name: input.name,
                ...(input.color !== undefined && { color: input.color })
            },
            retries: 3
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            status: providerGroup.status,
            visible_to_clients: providerGroup.visible_to_clients,
            created_at: providerGroup.created_at,
            updated_at: providerGroup.updated_at,
            title: providerGroup.title,
            inherits_status: providerGroup.inherits_status,
            type: providerGroup.type,
            url: providerGroup.url,
            app_url: providerGroup.app_url,
            bookmark_url: providerGroup.bookmark_url,
            subscription_url: providerGroup.subscription_url,
            comments_count: providerGroup.comments_count,
            comments_url: providerGroup.comments_url,
            boosts_count: providerGroup.boosts_count,
            boosts_url: providerGroup.boosts_url,
            position: providerGroup.position,
            parent: providerGroup.parent,
            bucket: providerGroup.bucket,
            creator: providerGroup.creator,
            description: providerGroup.description,
            description_attachments: providerGroup.description_attachments,
            completed: providerGroup.completed,
            completed_ratio: providerGroup.completed_ratio,
            name: providerGroup.name,
            ...(providerGroup.color != null && { color: providerGroup.color }),
            group_position_url: providerGroup.group_position_url,
            todos_url: providerGroup.todos_url,
            app_todos_url: providerGroup.app_todos_url,
            comments_app_url: providerGroup.comments_app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
