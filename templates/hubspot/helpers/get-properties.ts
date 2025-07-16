import { NangoSync, ProxyConfiguration } from "nango";
import type { Property } from '../models.js';

export async function getProperties(nango: NangoSync, entity: string): Promise<string[]> {
    const propertyConfig: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/properties
        endpoint: `/crm/v3/properties/${entity}`,
        retries: 10
    };
    const response = await nango.get(propertyConfig);

    const properties = response.data.results
        .filter((result: Property) => result.hubspotDefined)
        .map((result: Property) => {
            return result.name;
        });

    return properties;
}
