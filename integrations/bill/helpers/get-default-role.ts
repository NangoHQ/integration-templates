import type { NangoSync } from '../../models';

export async function getDefaultRoleId(nango: NangoSync): Promise<string> {
    const response = await nango.get({
        // https://developer.bill.com/reference/listorganizationuserroles
        endpoint: '/v3/roles',
        retries: 10
    });

    const { data } = response;

    if (!data.results || data.results.length === 0) {
        throw new Error('No roles found');
    }

    const { results } = data;

    const [role] = results;

    return role.id;
}
