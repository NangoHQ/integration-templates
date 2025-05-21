import type { NangoSync, ProxyConfiguration, RecruiterFlowUser } from '../../models';
import type { RecruiterFlowUserResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/User%20APIs/get_api_external_user_list
        endpoint: '/api/external/user/list',
        retries: 10
    };

    const response = await nango.get<RecruiterFlowUserResponse[]>(proxyConfig);
    const users = response.data;

    await nango.batchSave(users.map(toUser), 'RecruiterFlowUser');
}

function toUser(record: RecruiterFlowUserResponse): RecruiterFlowUser {
    return {
        id: record.id,
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name,
        role: record.role,
        created_at: record.created_at,
        updated_at: record.updated_at,
        is_active: record.is_active
    };
}
