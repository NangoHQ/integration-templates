import type { NangoAction, ProxyConfiguration, ZoomCreateUser, ActionResponseError, User } from '../../models';
import type { ZoomCreatedUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ZoomCreateUser): Promise<User> {
    const parsedInput = createUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to create a user'
        });
    }

    const zoomInput = {
        action: input.action || 'create',
        user_info: {
            ...input,
            email: input.email,
            first_name: input.firstName,
            last_name: input.lastName,
            type: determineUserType(input.type)
        }
    };

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userCreate
        endpoint: 'users',
        data: zoomInput,
        retries: 10
    };
    const response = await nango.post<ZoomCreatedUser>(config);

    const { data } = response;

    const user: User = {
        id: data.id.toString(),
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return user;
}

function determineUserType(type: ZoomCreateUser['type']): number {
    switch (type) {
        case 'basic':
            return 1;
        case 'licensed':
            return 2;
        case 'UnassignedWithoutMeetingsBasic':
            return 4;
        case 'None':
            return 99;
        default:
            return 1;
    }
}