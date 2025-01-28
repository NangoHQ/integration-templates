import type { NangoAction, ProxyConfiguration } from '../../models';

/**
 * Action: fetch-projects
 * Fetches all projects from Basecamp's /projects.json endpoint.
 */
export default async function runAction(nango: NangoAction): Promise<{ projects: unknown[] }> {
    const allProjects: unknown[] = [];

    const config: ProxyConfiguration = {
        //https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#projects
        endpoint: '/projects.json',
        retries: 5
    };

    const response = await nango.get<{ data: unknown[] }>(config);
    const projectsData = Array.isArray(response.data) ? response.data : [];
    allProjects.push(...projectsData);

    return { projects: allProjects };
}
