import type { NangoAction, NangoSync } from '../../models';
import type { CalendlyCurrentUser } from '../types';

/**
 * Retrieves the current organization id (uri) associated with the
 * logged-in user from the Calendly API.
 */
export async function getOrganizationId(nango: NangoAction | NangoSync): Promise<string> {
    const response = await nango.get<{ resource: CalendlyCurrentUser }>({
        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        endpoint: '/users/me',
        retries: 10
    });

    if (!response.data) {
        throw new nango.ActionError({ message: 'failed to get request info' });
    }

    const organizationId = response.data.resource.current_organization;

    if (!organizationId) {
        throw new nango.ActionError({ message: 'failed to get organization id' });
    }

    await nango.log(`Got organization id`);

    return organizationId;
}
