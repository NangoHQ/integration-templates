import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateUserInput } from '../../models';
import { updateUserInputSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: UpdateUserInput): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: updateUserInputSchema, input });

    await nango.put<MetabaseUser>(config);

    return {
        success: true
    };
}
