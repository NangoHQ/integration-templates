import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Deletes a user in Freshdesk
 *
 * Delete user Freshdesk API docs: https://developer.freshdesk.com/api/v1/#delete_user
 *
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
        endpoint: `/api/v2/contacts/${parsedInput.data.id}.json`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
