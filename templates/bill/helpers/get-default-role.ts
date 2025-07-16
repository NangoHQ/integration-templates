import { NangoAction } from "nango";
import type { RoleResponse, UserRole } from '../types.js';

export async function getDefaultRoleId(nango: NangoAction, headers: Record<string, string>): Promise<string> {
    const response = await nango.get<RoleResponse>({
        // https://developer.bill.com/reference/listorganizationuserroles
        endpoint: '/v3/roles',
        retries: 10,
        headers
    });

    const { data } = response;

    if (!data.results || data.results.length === 0) {
        throw new Error('No roles found');
    }

    const { results } = data;

    const defaultRole = results.find((role: UserRole) => role.type === 'ADMINISTRATOR');

    if (defaultRole) {
        return defaultRole.id;
    }

    const [role] = results;

    if (!role) {
        throw new nango.ActionError({
            message: 'No roles found'
        });
    }

    return role.id;
}
