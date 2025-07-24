import { createAction } from "nango";
import { validateAccountIdAndRetrieveBaseUrl } from '../helpers/validate-account-id.js';

import type { ProxyConfiguration } from "nango";
import type { BasecampProject} from "../models.js";
import { BasecampProjectsResponse } from "../models.js";
import { z } from "zod";

/**
 * Action: fetch-projects
 * Fetches *all* projects from Basecamp's /projects.json endpoint.
 */
const action = createAction({
    description: "Fetch all projects from Basecamp",
    version: "1.0.1",

    endpoint: {
        method: "GET",
        path: "/projects",
        group: "Projects"
    },

    input: z.void(),
    output: BasecampProjectsResponse,

    exec: async (nango): Promise<BasecampProjectsResponse> => {
        const allProjects: BasecampProject[] = [];
        const baseUrlOverride = await validateAccountIdAndRetrieveBaseUrl(nango);

        const config: ProxyConfiguration = {
            //https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#projects
            endpoint: '/projects.json',
            retries: 3,
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
