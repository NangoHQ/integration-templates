import { NangoAction } from '@nangohq/nango';
import { EmailEntity, SuccessResponse } from '../types';
import { emailEntitySchema } from '../schema.zod.ts';

export default async function deleteUser(
    input: EmailEntity,
    nango: NangoAction
): Promise<SuccessResponse> {
    // Validate input
    const validatedInput = emailEntitySchema.parse(input);

    // Make API call to Dialpad
    await nango.delete(`/users/email/${validatedInput.email}`);

    return { success: true };
} 