import type { NangoAction, User, OktaAddGroup, ProxyConfiguration, OktaCreateUser } from '../../models';
import { toUser, createUser } from '../mappers/toUser.js';
import { oktaCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<User> {
    nango.zodValidateInput({ zodSchema: oktaCreateUserSchema, input });

    const oktaGroup = createUser(oktaCreateUser);
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/createUser
        endpoint: '/api/v1/users',
        data: oktaGroup,
        retries: 10
    };

    const response = await nango.post(config);

    return toUser(response.data);
}
