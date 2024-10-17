import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.calendly.com/api-docs/269e89d9f559f-remove-user-from-organization
        endpoint: `/organization_memberships/${parsedInput.data.id}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
