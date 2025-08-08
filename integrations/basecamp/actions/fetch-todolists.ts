import { createAction } from 'nango';
import { validateAccountIdAndRetrieveBaseUrl } from '../helpers/validate-account-id.js';

import type { ProxyConfiguration } from 'nango';
import type { BasecampTodolist } from '../models.js';
import { BasecampTodolistsResponse, BasecampFetchTodolistsInput } from '../models.js';

/**
 * Action: fetch-todolists
 * Fetches *all* to-do lists from a Basecamp TodoSet.
 */
const action = createAction({
    description:
        'Fetch all todolists in a project.Fetch your projects via the fetch-projects action, then locate the project\'s dock item where "name": "todoset". The id there is your todoSetId.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/todolists',
        group: 'Todolists'
    },

    input: BasecampFetchTodolistsInput,
    output: BasecampTodolistsResponse,

    exec: async (nango, input): Promise<BasecampTodolistsResponse> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
