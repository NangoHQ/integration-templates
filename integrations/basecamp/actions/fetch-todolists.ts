import type { BasecampFetchTodolistsInput, BasecampTodolist, BasecampTodolistsResponse, NangoAction, ProxyConfiguration } from '../../models';
import { validateAccountIdAndRetrieveBaseUrl } from '../helpers/validate-account-id.js';

/**
 * Action: fetch-todolists
 * Fetches *all* to-do lists from a Basecamp TodoSet.
 */
export default async function runAction(nango: NangoAction, input: BasecampFetchTodolistsInput): Promise<BasecampTodolistsResponse> {
    const { projectId, todoSetId } = input;
    const allTodolists: BasecampTodolist[] = [];

    const baseUrlOverride = await validateAccountIdAndRetrieveBaseUrl(nango);

    const config: ProxyConfiguration = {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
        endpoint: `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
        retries: 3,
        paginate: {
            type: 'link',
            link_rel_in_response_header: 'next'
        }
    };

    if (baseUrlOverride) {
        config.baseUrlOverride = baseUrlOverride;
    }

    for await (const todolistsPage of nango.paginate<BasecampTodolist>(config)) {
        for (const todolist of todolistsPage) {
            allTodolists.push(todolist);
        }
    }

    return { todolists: allTodolists };
}
