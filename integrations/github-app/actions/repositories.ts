import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import type { Repository } from '../models.js';
import { RepoResponse } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'List all repositories accessible to this Github App',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/repositories',
        group: 'Repositories'
    },

    input: z.void(),
    output: RepoResponse,

    exec: async (nango): Promise<RepoResponse> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/apps/installations?apiVersion=2022-11-28#list-repositories-accessible-to-the-app-installation
            endpoint: '/installation/repositories',
            paginate: {
                limit: 100,
                response_path: 'repositories',
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page'
            }
        };

        const repositories: Repository[] = [];

        for await (const repo of nango.paginate(config)) {
            repositories.push(...repo);
        }

        return { repositories };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
