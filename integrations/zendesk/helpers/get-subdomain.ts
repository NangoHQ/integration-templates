import type { NangoAction, NangoSync } from '../../models.js';

export async function getSubdomain(nango: NangoSync | NangoAction): Promise<string | undefined> {
    const response = await nango.getConnection();
    return response.connection_config['subdomain'];
}
