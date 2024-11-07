import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import type { BillUser } from '../types';
import { getHeaders } from '../helpers/get-headers.js';


export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

    const headers = await getHeaders(nango);

    const getUsersConfig: ProxyConfiguration = {
        // https://developer.bill.com/reference/listorganizationusers
        endpoint: '/v3/users',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'page',
            cursor_path_in_response: 'nextPage',
            response_path: 'results',
            limit_name_in_request: 'max',
            limit: 100
        },
        headers: {
            sessionId: headers.sessionId,
            devKey: headers.devKey
        }
    };
    let foundUserId: string | undefined;
    
    for await (const billUsers of nango.paginate<BillUser>(getUsersConfig)) {
        const matchingUser = billUsers.find((user: BillUser) => user.email === input.email);
        if (matchingUser) {
            foundUserId = matchingUser.id;
            break;
        }
    }

    if (!foundUserId) {
        throw new nango.ActionError({
            message: `No user found with email ${input.email}`
        });
    }


    const archiveUserConfig: ProxyConfiguration = {
        // https://developer.bill.com/reference/archiveorganizationuser
        endpoint: `/v3/users/${foundUserId}/archive`,
        retries: 10,
        headers: {
            sessionId: headers.sessionId,
            devKey: headers.devKey
        }
    };

    await nango.post(archiveUserConfig);

    return {
        success: true
    };
}
