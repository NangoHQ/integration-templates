import type { NangoSync, ProxyConfiguration } from '../../models';
import { z } from 'zod';

/**
 * The shape of the metadata we read from nango.getMetadata().
 * Example: { projects: [ { projectId: 1234, todoSetId: 9999 }, ... ] }
 */
const metadataSchema = z.object({
    projects: z
        .array(
            z.object({
                projectId: z.number().positive(),
                todoSetId: z.number().positive() // we assume user has found the "todoset" ID from the dock
            })
        )
        .nonempty()
});

interface BasecampTodo {
    id: number;
    content: string;
    description?: string;
    completed: boolean;
    created_at: string;
    updated_at: string;
    due_on?: string;
    bucket_id: number;
    assignees?: {
        id: number;
        name: string;
        email_address?: string;
    }[];
}

export default async function runSync(nango: NangoSync): Promise<void> {
    // 1) Parse metadata
    const rawMetadata = await nango.getMetadata<any>();
    const parsed = metadataSchema.safeParse(rawMetadata);
    if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => `${e.message} at path ${e.path.join('.')}`).join('; ');
        throw new Error(`Invalid metadata for Basecamp todos sync: ${msg}`);
    }

    const { projects } = parsed.data;

    const finalTodos: BasecampTodo[] = [];

    for (const { projectId, todoSetId } of projects) {
        const listConfig: ProxyConfiguration = {
            //https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md
            endpoint: `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
            retries: 5
        };
        const listResp = await nango.get<any[]>(listConfig);
        // Suppose the response is an array of to-do lists
        const todoLists = Array.isArray(listResp.data) ? listResp.data : [];
        await nango.log(JSON.stringify(todoLists));

        // B) For each list, fetch all to-dos
        for (const list of todoLists) {
            const listId = list.id;
            if (!listId) continue;
            await nango.log(`Fetching to-dos for list ${listId}`);

            const todosConfig: ProxyConfiguration = {
                //https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-to-dos
                endpoint: `/buckets/${projectId}/todolists/${listId}/todos.json`,
                retries: 5
            };
            const todosResp = await nango.get<any[]>(todosConfig);
            await nango.log(JSON.stringify(todosResp));
            const bcTodos = Array.isArray(todosResp.data) ? todosResp.data : [];

            for (const bcTodo of bcTodos) {
                // Build our local shape
                const toStore: BasecampTodo = {
                    id: bcTodo.id,
                    content: bcTodo.content,
                    description: bcTodo.description || '',
                    completed: bcTodo.completed || false,
                    created_at: bcTodo.created_at,
                    updated_at: bcTodo.updated_at,
                    due_on: bcTodo.due_on,
                    bucket_id: projectId,
                    assignees: Array.isArray(bcTodo.assignees)
                        ? bcTodo.assignees.map((a: any) => ({
                              id: a.id,
                              name: a.name,
                              email_address: a.email_address
                          }))
                        : []
                };
                finalTodos.push(toStore);
            }
        }
    }

    const batch = finalTodos.map((todo) => ({
        id: String(todo.id), // ID must be a string
        row: todo
    }));

    if (batch.length > 0) {
        await nango.batchSave(batch, 'BasecampTodo');
    }
}
