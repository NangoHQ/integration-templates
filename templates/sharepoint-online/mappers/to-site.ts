import type { Site } from ../models.js;
import type { SharePointSite } from '../types.js';

/**
 * Converts a SharePointSite object to a slim Site object.
 * Only includes essential properties mapped from SharePointSite.
 * @param site The SharePointSite object to convert.
 * @returns Site object representing SharePoint site information.
 */
export function toSite(site: SharePointSite): Site {
    return {
        id: site.id,
        name: site.name,
        createdDateTime: site.createdDateTime,
        webUrl: site.webUrl
    };
}
