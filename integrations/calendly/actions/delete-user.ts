import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models.js';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developer.calendly.com/api-docs/269e89d9f559f-remove-user-from-organization
        endpoint: `/organization_memberships/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
