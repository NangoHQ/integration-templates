import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the to-do.'),
        todoId: z.number().describe('The ID of the to-do to retrieve.')
    })
    .describe('Input for retrieving a single Basecamp to-do.');

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderCompletionSchema = z.object({
    created_at: z.string(),
    creator: z.object({
        id: z.number(),
        name: z.string()
    })
});

function normalizePerson(person: z.infer<typeof ProviderPersonSchema>): { id: number; name: string; email_address?: string } {
    return {
        id: person.id,
        name: person.name,
        ...(person.email_address != null && { email_address: person.email_address })
    };
}

const ProviderTodoSchema = z.object({
    id: z.number(),
    status: z.string(),
    content: z.string(),
    title: z.string(),
    completed: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    due_on: z.string().nullable(),
    starts_on: z.string().nullable(),
    description: z.string(),
    url: z.string(),
    app_url: z.string(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    creator: ProviderPersonSchema,
    assignees: z.array(ProviderPersonSchema),
    completion: ProviderCompletionSchema.optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the to-do.'),
        status: z.string().describe('Current status of the to-do, e.g. "active".'),
        content: z.string().describe('The main text or title of the to-do.'),
        title: z.string().describe('The display title of the to-do.'),
        completed: z.boolean().describe('Whether the to-do has been marked as completed.'),
        created_at: z.string().describe('ISO 8601 timestamp when the to-do was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the to-do was last updated.'),
        due_on: z.string().optional().describe('Due date in YYYY-MM-DD format, if set.'),
        starts_on: z.string().optional().describe('Start date in YYYY-MM-DD format, if set.'),
        description: z.string().describe('HTML description of the to-do, may be empty.'),
        url: z.string().describe('API URL for the to-do.'),
        app_url: z.string().describe('Basecamp web application URL for the to-do.'),
        parent: z
            .object({
                id: z.number().describe('ID of the parent to-do list or set.'),
                title: z.string().describe('Title of the parent to-do list or set.'),
                type: z.string().describe('Type of the parent resource, e.g. "Todolist" or "Todoset".')
            })
            .describe('The parent to-do list or set that contains this to-do.'),
        bucket: z
            .object({
                id: z.number().describe('ID of the project (bucket).'),
                name: z.string().describe('Name of the project.'),
                type: z.string().describe('Type of the bucket, e.g. "Project".')
            })
            .describe('The project that contains this to-do.'),
        creator: z
            .object({
                id: z.number().describe('ID of the person who created the to-do.'),
                name: z.string().describe('Name of the person who created the to-do.'),
                email_address: z.string().optional().describe('Email address of the person who created the to-do, omitted for some integration-type people.')
            })
            .describe('The person who created the to-do.'),
        assignees: z
            .array(
                z.object({
                    id: z.number().describe('ID of the assigned person.'),
                    name: z.string().describe('Name of the assigned person.'),
                    email_address: z.string().optional().describe('Email address of the assigned person, omitted for some integration-type people.')
                })
            )
            .describe('People assigned to this to-do.'),
        completion: z
            .object({
                created_at: z.string().describe('ISO 8601 timestamp when the to-do was completed.'),
                creator: z
                    .object({
                        id: z.number().describe('ID of the person who completed the to-do.'),
                        name: z.string().describe('Name of the person who completed the to-do.')
                    })
                    .describe('The person who completed the to-do.')
            })
            .optional()
            .describe('Completion details, only present when the to-do is completed.')
    })
    .describe('A single Basecamp to-do.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single to-do from the Basecamp API without making any modifications.
 */
const action = createAction({
    description: 'Retrieve a single to-do.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-a-to-do
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todos/${encodeURIComponent(input.todoId)}.json`,
            retries: 3
        });

        const providerTodo = ProviderTodoSchema.parse(response.data);

        return {
            id: providerTodo.id,
            status: providerTodo.status,
            content: providerTodo.content,
            title: providerTodo.title,
            completed: providerTodo.completed,
            created_at: providerTodo.created_at,
            updated_at: providerTodo.updated_at,
            due_on: providerTodo.due_on ?? undefined,
            starts_on: providerTodo.starts_on ?? undefined,
            description: providerTodo.description,
            url: providerTodo.url,
            app_url: providerTodo.app_url,
            parent: providerTodo.parent,
            bucket: providerTodo.bucket,
            creator: normalizePerson(providerTodo.creator),
            assignees: providerTodo.assignees.map(normalizePerson),
            completion: providerTodo.completion
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
