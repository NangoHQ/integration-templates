import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { BillUser } from '../types';
import { getHeaders } from '../helpers/get-headers.js';

export default async function fetchData(nango: NangoSync) {
    const headers = await getHeaders(nango);

    const config: ProxyConfiguration = {
        // https://developer.bill.com/reference/listorganizationusers
        endpoint: 'users',
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
        },
    };

    for await (const billUsers of nango.paginate<BillUser>(config)) {
        const users: User[] = billUsers.map((user: BillUser) => {
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}