import { NangoAction, NangoSync } from "nango";

export async function getCredentials(nango: NangoSync | NangoAction): Promise<{ partnerUserID?: string; partnerUserSecret?: string }> {
    const connection = await nango.getConnection();

    let credentials: { partnerUserID?: string; partnerUserSecret?: string } = {};
    if ('username' in connection.credentials && 'password' in connection.credentials) {
        credentials = {
            partnerUserID: connection.credentials.username,
            partnerUserSecret: connection.credentials.password
        };
    } else {
        throw new nango.ActionError({
            message: `Basic API credentials are incomplete`
        });
    }

    return credentials;
}
