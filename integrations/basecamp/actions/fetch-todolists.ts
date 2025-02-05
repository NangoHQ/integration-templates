import type { BasecampFetchTodolistsInput, BasecampTodolist, BasecampTodolistsResponse, NangoAction, ProxyConfiguration } from '../../models'; // Adjust the path as needed

/**
 * Action: fetch-todolists
 * Fetches *all* to-do lists from Basecamp.
 */
export default async function runAction(nango: NangoAction, input: BasecampFetchTodolistsInput): Promise<BasecampTodolistsResponse> {
    const { projectId, todoSetId } = input;
    const allTodolists: BasecampTodolist[] = [];

    const config: ProxyConfiguration = {
        // Endpoint reference:
        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
        endpoint: `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
        retries: 10,
        paginate: {
            // We'll paginate based on the 'Link' headers
            type: 'link',
            link_rel_in_response_header: 'next'
        }
    };

    for await (const todolistsPage of nango.paginate<BasecampTodolist>(config)) {
        for (const todolist of todolistsPage) {
            allTodolists.push(todolist);
        }
    }

    return { todolists: allTodolists };
}
