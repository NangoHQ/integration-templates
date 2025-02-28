import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateUserInput } from '../../models';
import { updateUserInputSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: UpdateUserInput): Promise<SuccessResponse> {
    const parsedInput = updateUserInputSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a user'
        });
    }

    const { id, ...updateData } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: `/api/user/${id}`,
        retries: 5,
        data: updateData
    };

    await nango.put<MetabaseUser>(config);

    return {
        success: true
    };
}
