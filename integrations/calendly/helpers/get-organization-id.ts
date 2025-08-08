import type { NangoAction, NangoSync } from 'nango';
import type { CalendlyCurrentUser } from '../types.js';

/**
 * Retrieves the current organization id (uri and id) associated with the
 * logged-in user from the Calendly API.
 */
export async function getOrganizationId(nango: NangoAction | NangoSync): Promise<string> {
    const connection = await nango.getConnection();
    const organizationId = connection.connection_config['organizationId'];

    if (organizationId) {
        return organizationId;
    }

    await nango.log(`No organization id found in the connection config. Attempting to get it from fetching it from the logged-in user`);

    const response = await nango.get<{ resource: CalendlyCurrentUser }>({
        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        endpoint: '/users/me',
        retries: 10
    });

    if (!response.data) {
        if ('ActionError' in nango) {
            throw new nango.ActionError({ message: 'failed to get request info' });
        } else {
            throw new Error('failed to get request info');
        }
    }

    const organizationBaseUri = response.data.resource.current_organization;

    if (!organizationBaseUri) {
        if ('ActionError' in nango) {
            throw new nango.ActionError({ message: 'failed to get organization id' });
        } else {
            throw new Error('failed to get organization id');
        }
    }

    const id = organizationBaseUri.split('/').pop() ?? '';

    if (!id) {
        if ('ActionError' in nango) {
            throw new nango.ActionError({ message: 'failed to get organization id' });
        } else {
            throw new Error('failed to get organization id');
        }
    }

    return id;
}
