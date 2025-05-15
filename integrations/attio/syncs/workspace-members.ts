import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { AttioWorkspaceMember, AttioResponse } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://docs.attio.com/rest-api/endpoint-reference/workspace-members/list-workspace-members
        endpoint: '/v2/workspace_members',
        method: 'GET',
        retries: 10
    };

    const response = await nango.get<AttioResponse<AttioWorkspaceMember>>(config);
    await nango.batchSave(response.data.data, 'AttioWorkspaceMember');
}
