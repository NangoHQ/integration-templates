import type { NangoAction, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config = {
        // https://developer.calendly.com/api-docs/e2f95ebd44914-remove-user-from-organization
        endpoint: `/organization_memberships/${input.id}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
