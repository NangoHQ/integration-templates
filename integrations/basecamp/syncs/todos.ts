import type { BasecampTodo, BasecampPerson, TodosMetadata, NangoSync, ProxyConfiguration } from '../../models.js';
import { todosMetadataSchema } from '../schema.zod.js';
import { validateAccountIdAndRetrieveBaseUrl } from '../helpers/validate-account-id.js';

/**
 * Sync: Todos
 */
export default async function runSync(nango: NangoSync): Promise<void> {
    const rawMetadata = await nango.getMetadata<TodosMetadata>();
    const parsed = todosMetadataSchema.safeParse(rawMetadata);
    if (!parsed.success) {
        const msg = parsed.error.issues.map((e) => `${e.message} at path ${e.path.join('.')}`).join('; ');
        throw new Error(`Invalid metadata for Basecamp todos sync: ${msg}`);
    }

    const baseUrlOverride = await validateAccountIdAndRetrieveBaseUrl(nango);

    const { projects } = parsed.data;

    for (const { projectId, todoSetId } of projects) {
        const listConfig: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md
            endpoint: `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
            retries: 10,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            }
        };

        if (baseUrlOverride) {
            listConfig.baseUrlOverride = baseUrlOverride;
        }

        const finalTodos: BasecampTodo[] = [];
        for await (const listsPage of nango.paginate(listConfig)) {
            for (const list of listsPage) {
                const listId = list.id;
                if (!listId) continue;

                const todosConfig: ProxyConfiguration = {
                    // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#get-to-dos
                    endpoint: `/buckets/${projectId}/todolists/${listId}/todos.json`,
                    retries: 10,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    }
                };

                if (baseUrlOverride) {
                    todosConfig.baseUrlOverride = baseUrlOverride;
                }

                for await (const bcTodosPage of nango.paginate<BasecampTodo>(todosConfig)) {
                    for (const bcTodo of bcTodosPage) {
                        const toStore: BasecampTodo = {
                            id: bcTodo.id.toString(),
                            content: bcTodo.content,
                            description: bcTodo.description || '',
                            completed: bcTodo.completed || false,
                            created_at: bcTodo.created_at,
                            updated_at: bcTodo.updated_at,
                            due_on: bcTodo.due_on,
                            bucket_id: projectId,
                            assignees: Array.isArray(bcTodo.assignees)
                                ? bcTodo.assignees.map((a: BasecampPerson) => ({
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
        if (finalTodos.length > 0) {
            await nango.batchSave(finalTodos, 'BasecampTodo');
        }
    }
}
