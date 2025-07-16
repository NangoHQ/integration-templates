import { NangoAction, NangoSync } from "nango";

export async function getSubdomain(nango: NangoSync | NangoAction): Promise<string | undefined> {
    const response = await nango.getConnection();
    return response.connection_config['subdomain'];
}
