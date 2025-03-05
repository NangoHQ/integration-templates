import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import { createUserSchema } from '../schema.zod.js';
import type { ZendeskUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

    const subdomain = await getSubdomain(nango);

    const data = {
        user: {
            name: `${parsedInput.data.firstName} ${parsedInput.data.lastName}`,
            email: parsedInput.data.email,
            role: parsedInput.data.role || 'agent'
        }
    };

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#create-user
        endpoint: '/api/v2/users',
        retries: 10,
        data
    };

    const response = await nango.post<{ user: ZendeskUser }>(config);

    const { data: dataResponse } = response;

    const user: User = {
        id: dataResponse.user.id.toString(),
        firstName: dataResponse.user.name.split(' ')[0] || '',
        lastName: dataResponse.user.name.split(' ')[1] || '',
        email: dataResponse.user.email
    };

    return user;
}
