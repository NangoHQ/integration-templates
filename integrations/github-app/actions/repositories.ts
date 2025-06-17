import type { NangoSync, RepoResponse, Repository, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoSync): Promise<RepoResponse> {
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
