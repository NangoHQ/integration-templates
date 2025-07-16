import { createAction } from "nango";
import type { SharePointSite } from '../types.js';
import { toSite } from '../mappers/to-site.js';

import { SharepointSites } from "../models.js";
import { z } from "zod";

/**
 * Retrieves SharePoint sites using NangoAction, maps them to Site objects,
 * and returns the mapped sites.
 *
 * @param nango An instance of NangoAction for handling listing of sites.
 * @returns An array of Site objects representing SharePoint sites
 */
const action = createAction({
    description: "This action will be used to display a list of sites to the end-user, who will pick the ones he wants to sync.\nThe connection metadata should be set based on the file selection.",
    version: "2.0.1",

    endpoint: {
        method: "GET",
        path: "/list-sites"
    },

    input: z.void(),
    output: SharepointSites,
    scopes: ["Sites.Read.All", "Sites.Selected", "offline_access"],

    exec: async (nango): Promise<SharepointSites> => {
        const response = await nango.get<{ value: SharePointSite[] }>({
            endpoint: 'v1.0/sites',
            params: {
                search: '*'
            },
            retries: 3
        });

        const { value: sites } = response.data;

        const mappedSites = sites.map(toSite);

        return {
            sitesToSync: mappedSites
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
