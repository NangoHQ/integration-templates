import type { NangoSync, EvaluAgentRole, ProxyConfiguration } from '../../models';

interface EvaluAgentRoleResponse {
    id: string;
    attributes: EvaluAgentRole;
}

export default async function fetchData(nango: NangoSync) {
    const payload: ProxyConfiguration = {
        // https://docs.evaluagent.com/#operation/fetchRoles
        endpoint: '/v1/org/roles',
        retries: 10
    };

    const response = await nango.get(payload);

    const returnedData = response.data.data;

    const mappedRoles: EvaluAgentRole[] = returnedData.map((role: EvaluAgentRoleResponse) => ({
        id: role.id,
        title: role.attributes.title,
        name: role.attributes.name
    }));

    if (mappedRoles.length > 0) {
        await nango.batchSave<EvaluAgentRole>(mappedRoles, 'EvaluAgentRole');
        await nango.log(`Sent ${mappedRoles.length} roles`);
    }
}
