import type { NangoAction, ProxyConfiguration, User, IntercomCreateUser } from '../../models';
import { intercomCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IntercomCreateUser): Promise<User> {
    const parsedInput = intercomCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { firstName, lastName, ...userInput } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/1.1/rest-api/users/create-or-update-user
        endpoint: `/users`,
        data: {
            ...userInput,
            name: `${firstName} ${lastName}`
        },
        retries: 10
    };

    // TODO: update post<type>
    const response = await nango.post<any>(config);

    const { data } = response;

    const [firstNameOutput, lastNameOutput] = (data?.contact?.name ?? '').split(' ');

    const user: User = {
        id: data.id.toString(),
        firstName: firstNameOutput || firstName,
        lastName: lastNameOutput || lastName,
        email: data.contact.email || ''
    };

    return user;
}
