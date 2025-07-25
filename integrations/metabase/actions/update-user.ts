import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateUserInput } from '../../models.js';
import { updateUserInputSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types.js';

export default async function runAction(nango: NangoAction, input: UpdateUserInput): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: updateUserInputSchema, input });

    const { id, ...updateData } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: `/api/user/${id}`,
        retries: 3,
        data: updateData
    };

    await nango.put<MetabaseUser>(config);

    return {
        success: true
    };
}
