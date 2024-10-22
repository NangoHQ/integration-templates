import type { NangoAction, ProxyConfiguration, BillCreateUser, ActionResponseError, User } from '../../models';
import type { BillCreateUserInput, BillUser } from '../types';
import { billCreateUserSchema } from '../schema.zod.js';
import { getHeaders } from '../helpers/get-headers.js';
import { getDefaultRoleId } from '../helpers/get-default-role.js';

export default async function runAction(nango: NangoAction, input: BillCreateUser): Promise<User> {
    const parsedInput = billCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to create a user'
        });
    }

    const headers = await getHeaders(nango);

    let roleId = parsedInput.data.roleId;

    if (!roleId) {
        roleId = await getDefaultRoleId(nango, headers);
    }

    const BillInput: BillCreateUserInput = {
        firstName: parsedInput.data.firstName,
        lastName: parsedInput.data.lastName,
        email: parsedInput.data.email,
        roleId,
        acceptTermsOfService: parsedInput.data.acceptTermsOfService || true
    };

    const config: ProxyConfiguration = {
        // https://developer.bill.com/reference/createorganizationuser
        endpoint: '/v3/users',
        data: BillInput,
        retries: 10,
        headers: {
            sessionId: headers.sessionId,
            devKey: headers.devKey
        }
    };

    const response = await nango.post<BillUser>(config);

    const { data } = response;

    const user: User = {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
    };

    return user;
}
