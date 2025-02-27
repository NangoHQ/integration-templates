import type { NangoAction, CreateUser, ExpsensifyNullableUser } from '../../models';
import { getAdminPolicy } from '../helpers/policies.js';
import { getCredentials } from '../helpers/credentials.js';
import { createUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<ExpsensifyNullableUser> {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });

    return user;
}
