import type { NangoSync, NangoAction } from "nango";

function hasSessionAndDevKey(credentials: any): credentials is { session_id: string; dev_key: string } {
    return 'session_id' in credentials && 'dev_key' in credentials;
}

export async function getHeaders(nango: NangoSync | NangoAction): Promise<{ sessionId: string; devKey: string }> {
    const connection = await nango.getConnection();

    if (!connection || !connection.credentials) {
        throw new nango.ActionError({
            message: `Connection or credentials are missing`
        });
    }

    if (!hasSessionAndDevKey(connection.credentials)) {
        throw new nango.ActionError({
            message: `Session ID and Developer Key are incomplete or missing`
        });
    }

    const sessionId = connection.credentials.session_id;
    const devKey = connection.credentials.dev_key;

    return {
        sessionId,
        devKey
    };
}
