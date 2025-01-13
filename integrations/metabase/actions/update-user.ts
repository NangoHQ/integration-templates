import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateUserInput } from '../../models';
import { updateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: UpdateUserInput): Promise<SuccessResponse> {
    // Validate input schema
    const parsedInput = updateUserSchema.safeParse(input);
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
        // https://www.metabase.com/docs/latest/api/user/${input.id}/
        endpoint: `/api/user/${id}`,
        method: 'PUT',
        retries: 5,
        data: updateData
    };

    await nango.put<SuccessResponse>(config);

    // Log the success response
    await nango.log(`User updated successfully with ID: ${id}`);

    return {
        success: true
    };
}
