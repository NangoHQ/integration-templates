import type { NangoAction, ProxyConfiguration, SuccessResponse, OktaAssignRemoveUserGroup, ActionResponseError } from '../../models';
import { oktaAssignRemoveUserGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAssignRemoveUserGroup): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: oktaAssignRemoveUserGroupSchema, input });

    await nango.delete(config);

    return {
        success: true
    };
}
