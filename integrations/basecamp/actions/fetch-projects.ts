import type { BasecampProject, BasecampProjectsResponse, NangoAction, ProxyConfiguration } from '../../models';
import { validateAccountIdAndRetrieveBaseUrl } from '../helpers/validate-account-id.js';

/**
 * Action: fetch-projects
 * Fetches *all* projects from Basecamp's /projects.json endpoint.
 */
export default async function runAction(nango: NangoAction): Promise<BasecampProjectsResponse> {
    const allProjects: BasecampProject[] = [];
    const baseUrlOverride = await validateAccountIdAndRetrieveBaseUrl(nango);

    const config: ProxyConfiguration = {
        //https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#projects
        endpoint: '/projects.json',
        retries: 10,
        paginate: {
            type: 'link',
            link_rel_in_response_header: 'next'
        }
    };

    if (baseUrlOverride) {
        config.baseUrlOverride = baseUrlOverride;
    }

    for await (const projectsPage of nango.paginate<BasecampProject>(config)) {
        for (const project of projectsPage) {
            allProjects.push(project);
        }
    }

    return { projects: allProjects };
}
