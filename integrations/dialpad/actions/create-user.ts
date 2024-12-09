import { NangoAction } from '@nangohq/nango';
import { DialpadCreateUser, User } from '../types';
import { dialpadCreateUserSchema } from '../schema.zod.ts';

export default async function createUser(
    input: DialpadCreateUser,
    nango: NangoAction
): Promise<User> {
    // Validate input
    const validatedInput = dialpadCreateUserSchema.parse(input);

    // Make API call to Dialpad
    const response = await nango.post('/users', {
        data: validatedInput
    });

    return response.data;
} 