import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { emailEntitySchema } from '../schema.zod.js';
import { DatadogUser } from '../types';


async function getUserIdByEmail(nango: NangoAction, email: string): Promise<string> {
    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/#list-all-users
        endpoint: '/v2/users',
        retries: 10,
        params: {
            // @ts-expect-error param type mismatch
            filter: {
                status: 'active'
            }
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page[number]',
            offset_calculation_method: 'per-page',
            response_path: 'data',
            limit_name_in_request: 'page[size]'
        }
    };

    let foundUserId: string | null = null;
    
    for await (const dUsers of nango.paginate<DatadogUser>(config)) {
        for (const dUser of dUsers) {
            if (dUser.attributes.email === email) {
                foundUserId = dUser.id;
                break;
            }
        }
        if (foundUserId) {
            break;
        }
    }

    if (!foundUserId) {
        throw new Error(`User with email ${email} not found`);
    }

    return foundUserId;

}

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: `Invalid input: ${parsedInput.error.errors.map(e => `${e.message} at path ${e.path.join('.')}`).join(', ')}`
        });
    }

    const userId = await getUserIdByEmail(nango, parsedInput.data.email);


    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/?code-lang=typescript#disable-a-user
        endpoint: `/v2/users/${userId}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
