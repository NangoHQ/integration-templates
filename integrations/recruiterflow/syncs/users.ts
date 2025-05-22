import type { NangoSync, RecruiterFlowUser, ProxyConfiguration } from '../../models';
import type { RecruiterFlowUserResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/User%20APIs/get_api_external_user_list
        endpoint: '/api/external/user/list',
        retries: 10
    };

    const response = await nango.get<{ data: RecruiterFlowUserResponse[] }>(proxyConfig);
    const users = response.data.data;

    await nango.batchSave(users.map(toUser), 'RecruiterFlowUser');
}

function toUser(record: RecruiterFlowUserResponse): RecruiterFlowUser {
    return {
        id: record.id,
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name,
        role: record.role?.map((role) => role.name),
        img_link: record.img_link
    };
}
