import type { NangoAction, User, OktaAddGroup, ProxyConfiguration, OktaCreateUser } from '../../models.js';
import { toUser, createUser } from '../mappers/toUser.js';
import { oktaCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<User> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: oktaCreateUserSchema, input });

    const oktaCreateUser: OktaCreateUser = {
        firstName: parsedInput.data.firstName,
        lastName: parsedInput.data.lastName,
        email: parsedInput.data.email,
        login: parsedInput.data.login,
        mobilePhone: parsedInput.data.mobilePhone
    };

    const oktaGroup = createUser(oktaCreateUser);
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/createUser
        endpoint: '/api/v1/users',
        data: oktaGroup,
        retries: 3
    };

    const response = await nango.post(config);

    return toUser(response.data);
}
