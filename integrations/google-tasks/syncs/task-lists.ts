import { createSync, type ProxyConfiguration } from 'nango';
import { ProviderTaskListSchema, TaskListSchema, toTaskList } from '../helpers/schemas.js';

const sync = createSync({
    description: 'Sync metadata (title, updated timestamp) for every task list in the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['https://www.googleapis.com/auth/tasks'],
    models: {
        TaskList: TaskListSchema
    },

    exec: async (nango) => {
        // tasklists.list has no changed-since filter, so this is a full refresh on every
        // run; trackDeletes removes lists that disappeared since the previous execution.
        await nango.trackDeletesStart('TaskList');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
            endpoint: '/tasks/v1/users/@me/lists',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit_name_in_request: 'maxResults',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const taskLists = page.map((item) => toTaskList(ProviderTaskListSchema.parse(item)));

            if (taskLists.length > 0) {
                await nango.batchSave(taskLists, 'TaskList');
            }
        }

        await nango.trackDeletesEnd('TaskList');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
