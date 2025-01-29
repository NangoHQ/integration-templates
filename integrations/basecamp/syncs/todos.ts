import type { BasecampTodo, NangoSync, ProxyConfiguration } from '../../models';
import { metadataSchema } from '../schema.zod.js';
import type { Metadata } from '../types.js';

/**
 * The shape of the metadata we read from nango.getMetadata().
 * Example: { projects: [ { projectId: 1234, todoSetId: 9999 }, ... ] }
 */
export default async function runSync(nango: NangoSync): Promise<void> {
    const rawMetadata = await nango.getMetadata<Metadata>();
    const parsed = metadataSchema.safeParse(rawMetadata);
    if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => `${e.message} at path ${e.path.join('.')}`).join('; ');
        throw new Error(`Invalid metadata for Basecamp todos sync: ${msg}`);
    }

    const { projects } = parsed.data;
    const finalTodos: BasecampTodo[] = [];

    for (const { projectId, todoSetId } of projects) {
        const listConfig: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md
            endpoint: `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
            retries: 5,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            }
        };

        for await (const listsPage of nango.paginate(listConfig)) {
            for (const list of listsPage) {
                const listId = list.id;
                if (!listId) continue;

                const todosConfig: ProxyConfiguration = {
                    // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-to-dos
                    endpoint: `/buckets/${projectId}/todolists/${listId}/todos.json`,
                    retries: 5,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    }
                };

                for await (const bcTodosPage of nango.paginate<BasecampTodo>(todosConfig)) {
                    for (const bcTodo of bcTodosPage) {
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
        }
    }

    if (finalTodos.length > 0) {
        await nango.batchSave(finalTodos, 'BasecampTodo');
    }
}
