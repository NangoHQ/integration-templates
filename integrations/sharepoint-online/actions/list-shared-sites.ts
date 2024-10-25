import type { NangoAction, SharepointSites } from '../../models';
import type { SharePointSite } from '../types';
import { toSite } from '../mappers/to-site.js';

/**
 * Retrieves SharePoint sites using NangoAction, maps them to Site objects,
 * and returns the mapped sites.
 *
 * @param nango An instance of NangoAction for handling listing of sites.
 * @returns An array of Site objects representing SharePoint sites
 */
export default async function runAction(nango: NangoAction): Promise<SharepointSites> {
    const response = await nango.get<{ value: SharePointSite[] }>({
        endpoint: 'v1.0/sites',
        params: {
            search: '*'
        },
        retries: 10
    });

    const { value: sites } = response.data;

    const mappedSites = sites.map(toSite);

    return {
        sitesToSync: mappedSites
    };
}
