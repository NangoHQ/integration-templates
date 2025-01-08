import type { MetabaseCreateUser, NangoAction, ProxyConfiguration } from '../../models';
import { CreateUserInputSchema, UserSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: MetabaseCreateUser) {
    const validatedInput = CreateUserInputSchema.parse(input);
    const metabaseInput = {
        first_name: validatedInput.firstName,
        last_name: validatedInput.lastName,
        email: validatedInput.email
    };
    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: '/api/user',
        data: metabaseInput,
        retries: 10
    };

    const response = await nango.post<MetabaseUser>(config);

    return UserSchema.parse(response.data);
}
