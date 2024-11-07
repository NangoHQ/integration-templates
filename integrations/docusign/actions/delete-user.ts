import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { emailEntitySchema } from '../schema.zod.js';

/**
 * Finds a DocuSign user by their email address.
 * 
 * @param nango - The NangoAction instance for making API calls
 * @param baseUri - The base URI for the DocuSign API
 * @param accountId - The DocuSign account ID
 * @param email - The email address to search for
 * @returns The user ID of the matching user
 * @throws {NangoActionError} If no user is found with the given email
 */

async function findUserByEmail(nango: NangoAction, baseUri: string, accountId: string, email: string): Promise<string> {
    const proxyConfiguration: ProxyConfiguration = {
        baseUrlOverride: baseUri,
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        params: {
            status: 'Active,ActivationRequired,ActivationSent',
            email: email
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'start_position',
            limit_name_in_request: 'count',
            response_path: 'users',
            limit: 100
        }
    };

    for await (const docuSignUsers of nango.paginate(proxyConfiguration)) {
        const matchingUser = docuSignUsers.find((user: any) => user.email === email);
        
        if (matchingUser) {
            return matchingUser.userId;
        }
    }

    throw new nango.ActionError({
        message: `No user found with email: ${email}`
    });
}

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

     const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }
    
    const { baseUri, accountId } = await getRequestInfo(nango);

    const userId = await findUserByEmail(nango, baseUri, accountId, input.email);

    const config: ProxyConfiguration = {
        baseUrlOverride: baseUri,
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        data: {
            users: [{ userId }]
        },
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
