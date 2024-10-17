import type { NangoAction, NangoSync } from '../../models';
import type { CalendlyCurrentUser } from '../types';

/**
 * Retrieves the current organization id (uri and id) associated with the
 * logged-in user from the Calendly API.
 */
export async function getOrganizationId(nango: NangoAction | NangoSync): Promise<{ uri: string; id: string }> {
    const connection = await nango.getConnection();
    let organizationBaseUri = connection.connection_config['organizationId'];

    if (organizationBaseUri) return mapOrganizationId(organizationBaseUri);

    await nango.log(`No organization id found in the connection config. Attempting to get it from fetching it from the logged-in user`);

    const response = await nango.get<{ resource: CalendlyCurrentUser }>({
        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        endpoint: '/users/me',
        retries: 10
    });

    if (!response.data) {
        throw new nango.ActionError({ message: 'failed to get request info' });
    }

    organizationBaseUri = response.data.resource.current_organization;

    if (!organizationBaseUri) {
        throw new nango.ActionError({ message: 'failed to get organization id' });
    }

    await nango.log(`Got organization id`);

    return mapOrganizationId(organizationBaseUri);
}

function mapOrganizationId(organizationBaseUri: string): { uri: string; id: string } {
    return {
        id: organizationBaseUri.split('/').pop() ?? '',
        uri: organizationBaseUri
    };
}
