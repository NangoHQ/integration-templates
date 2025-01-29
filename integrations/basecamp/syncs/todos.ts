import type { BasecampTodo, NangoSync, ProxyConfiguration } from '../../models';
import { metadataSchema } from '../schema.zod.js';

/**
 * The shape of the metadata we read from nango.getMetadata().
 * Example: { projects: [ { projectId: 1234, todoSetId: 9999 }, ... ] }
 */

export default async function runSync(nango: NangoSync): Promise<void> {
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
        const todoLists = Array.isArray(listResp.data) ? listResp.data : [];

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
            const bcTodos = Array.isArray(todosResp.data) ? todosResp.data : [];

            for (const bcTodo of bcTodos) {
                const toStore: BasecampTodo = {
                    id: String(bcTodo.id),
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

    if (finalTodos.length > 0) {
        await nango.batchSave(finalTodos, 'BasecampTodo');
    }
}
