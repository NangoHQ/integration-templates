import { NangoSync, NangoAction } from "nango";

export async function getCredentials(nango: NangoSync | NangoAction): Promise<{ cid: number; provhash: string }> {
    const connection = await nango.getConnection();

    if ('username' in connection.credentials && 'password' in connection.credentials) {
        const cid = connection.credentials['username'];
        const provhash = connection.credentials['password'];

        return {
            cid,
            provhash
        };
    } else {
        throw new nango.ActionError({
            message: `Credentials (username, password) are incomplete`
        });
    }
}
