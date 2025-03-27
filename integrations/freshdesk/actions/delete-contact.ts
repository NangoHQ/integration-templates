import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Deletes a user in Freshdesk
 *
 * Delete user Freshdesk API docs: https://developer.freshdesk.com/api/#soft_delete_contact
 *
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#soft_delete_contact
        endpoint: `/api/v2/contacts/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
