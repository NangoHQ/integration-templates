import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    await nango.delete(config);

    return {
        success: true
    };
}
