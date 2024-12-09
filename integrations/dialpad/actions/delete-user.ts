import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../models';
import { emailEntitySchema } from '../schema.zod';

/**
 * Executes the delete user action by validating email input and making the API call
 * to Dialpad to delete the user.
 * API Reference: https://developers.dialpad.com/reference/usersdelete
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid email provided to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/usersdelete
        endpoint: `/users/email/${encodeURIComponent(parsedInput.data.email)}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
