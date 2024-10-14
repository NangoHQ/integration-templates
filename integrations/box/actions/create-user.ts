import type { NangoAction, CreateUser, CreatedUser } from '../../models';

function validateInput(nango: NangoAction, input: CreateUser): void {
    if (!input.login && input.is_platform_access_only !== true) {
        throw new nango.ActionError({
            message: 'The email address the user uses to log in is required'
        });
    }

    if (!input.name) {
        throw new nango.ActionError({
            message: 'Name is required'
        });
    }
}

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<CreatedUser> {
    validateInput(nango, input);

    const config = {
        // https://developer.box.com/reference/post-users/
        endpoint: `/2.0/users`,
        data: input,
        retries: 10
    };

    const response = await nango.post(config);

    return response.data;
}
