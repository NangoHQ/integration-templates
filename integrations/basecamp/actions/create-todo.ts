import { z } from 'zod';
import { createAction } from 'nango';

const PersonOutputSchema = z
    .object({
        id: z.number().describe('Person ID.'),
        name: z.string().describe('Person name.'),
        email_address: z.string().optional().describe('Person email address.')
    })
    .describe('A person assigned to or subscribed to a to-do.');

const OutputSchema = z
    .object({
        id: z.number().describe('The created to-do ID.'),
        content: z.string().describe('The to-do content.'),
        description: z.string().optional().describe('The to-do description.'),
        status: z.string().describe('The to-do status.'),
        completed: z.boolean().describe('Whether the to-do is completed.'),
        due_on: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
        starts_on: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
        assignees: z.array(PersonOutputSchema).describe('People assigned to the to-do.'),
        completion_subscribers: z.array(PersonOutputSchema).describe('People notified when the to-do is completed.'),
        url: z.string().describe('API URL for the to-do.')
    })
    .describe('Output of a created Basecamp to-do.');

const InputSchema = z
    .object({
        project_id: z.number().describe('The project ID (bucket) containing the to-do list.'),
        todolist_id: z.number().describe('The to-do list ID to create the to-do in.'),
        content: z.string().describe('The to-do content.'),
        description: z.string().optional().describe('Optional HTML description of the to-do.'),
        due_on: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
        starts_on: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
        notify: z.boolean().optional().describe('Whether to notify assignees about being assigned.'),
        assignee_emails: z.array(z.string()).optional().describe('Email addresses of people to assign. Resolved to IDs before the API call.'),
        assignee_ids: z.array(z.number()).optional().describe('Direct person IDs to assign.'),
        completion_subscriber_emails: z
            .array(z.string())
            .optional()
            .describe('Email addresses of people to notify on completion. Resolved to IDs before the API call.'),
        completion_subscriber_ids: z.array(z.number()).optional().describe('Direct person IDs to notify on completion.')
    })
    .describe('Input for creating a Basecamp to-do.');

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional()
});

const ProviderTodoSchema = z.object({
    id: z.number(),
    content: z.string(),
    description: z.string().optional(),
    status: z.string(),
    completed: z.boolean(),
    due_on: z.string().nullable().optional(),
    starts_on: z.string().nullable().optional(),
    assignees: z.array(ProviderPersonSchema).optional(),
    completion_subscribers: z.array(ProviderPersonSchema).optional(),
    url: z.string()
});

/**
 * @tags: [read, write]
 * @tagReason: Reads all account people to resolve email addresses to IDs, then writes a new to-do.
 * @pitfalls: Resolving emails to person IDs requires reading all account people and unmatched emails raise an error; returned assignee and subscriber email addresses may be redacted for non-admin callers.
 */
const action = createAction({
    description: 'Create a to-do in a specific to-do list, resolving assignee/completion-subscriber emails to person IDs first.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const assigneeIds: number[] = input.assignee_ids ? [...input.assignee_ids] : [];
        const completionSubscriberIds: number[] = input.completion_subscriber_ids ? [...input.completion_subscriber_ids] : [];

        if (input.assignee_emails?.length || input.completion_subscriber_emails?.length) {
            const PersonSchema = z.object({
                id: z.number(),
                email_address: z.string().nullable().optional()
            });

            const emailToId = new Map<string, number>();

            // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-all-people
            for await (const page of nango.paginate<unknown>({
                endpoint: '/people.json',
                retries: 3,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next'
                }
            })) {
                const people = z.array(PersonSchema).parse(page);
                for (const person of people) {
                    if (person.email_address) {
                        emailToId.set(person.email_address, person.id);
                    }
                }
            }

            if (input.assignee_emails) {
                for (const email of input.assignee_emails) {
                    const id = emailToId.get(email);
                    if (id === undefined) {
                        throw new nango.ActionError({
                            type: 'person_not_found',
                            message: `No person found with email address: ${email}`
                        });
                    }
                    if (!assigneeIds.includes(id)) {
                        assigneeIds.push(id);
                    }
                }
            }

            if (input.completion_subscriber_emails) {
                for (const email of input.completion_subscriber_emails) {
                    const id = emailToId.get(email);
                    if (id === undefined) {
                        throw new nango.ActionError({
                            type: 'person_not_found',
                            message: `No person found with email address: ${email}`
                        });
                    }
                    if (!completionSubscriberIds.includes(id)) {
                        completionSubscriberIds.push(id);
                    }
                }
            }
        }

        const payload: Record<string, unknown> = {
            content: input.content
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.due_on !== undefined) {
            payload['due_on'] = input.due_on;
        }
        if (input.starts_on !== undefined) {
            payload['starts_on'] = input.starts_on;
        }
        if (input.notify !== undefined) {
            payload['notify'] = input.notify;
        }
        if (assigneeIds.length > 0) {
            payload['assignee_ids'] = assigneeIds;
        }
        if (completionSubscriberIds.length > 0) {
            payload['completion_subscriber_ids'] = completionSubscriberIds;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#create-a-to-do
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.project_id))}/todolists/${encodeURIComponent(String(input.todolist_id))}/todos.json`,
            data: payload,
            retries: 3
        });

        const providerTodo = ProviderTodoSchema.parse(response.data);

        return {
            id: providerTodo.id,
            content: providerTodo.content,
            ...(providerTodo.description !== undefined && { description: providerTodo.description }),
            status: providerTodo.status,
            completed: providerTodo.completed,
            ...(providerTodo.due_on != null && { due_on: providerTodo.due_on }),
            ...(providerTodo.starts_on != null && { starts_on: providerTodo.starts_on }),
            assignees: (providerTodo.assignees || []).map((person) => ({
                id: person.id,
                name: person.name,
                ...(person.email_address != null && { email_address: person.email_address })
            })),
            completion_subscribers: (providerTodo.completion_subscribers || []).map((person) => ({
                id: person.id,
                name: person.name,
                ...(person.email_address != null && { email_address: person.email_address })
            })),
            url: providerTodo.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
