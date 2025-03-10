import type { NangoSync } from '../../models';

export async function getAccessToken(nango: NangoSync) {
    const connection = await nango.getConnection();
    let access_token: string;
    if ('access_token' in connection.credentials) {
        access_token = connection.credentials.access_token;
    } else {
        throw new nango.ActionError({
            message: `access_token is missing in the connection credentials`
        });
    }
    return access_token;
}
