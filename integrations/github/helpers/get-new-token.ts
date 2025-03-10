import type { NangoSync } from '../../models.js';
import { rotateConnections } from './rotate-connections';

export async function getNewToken(nango: NangoSync, accessToken: string, connections: string[], currToken: string) {
    if (connections.length === 0) {
        return accessToken;
    }

    let remainingConnections = [...connections];

    while (remainingConnections.length > 0) {
        const connString = rotateConnections(remainingConnections, nango) ?? '';
        // @allowTryCAtch
        try {
            const conn = await nango.getConnection('github', connString);
            currToken = 'access_token' in conn.credentials ? conn.credentials.access_token : accessToken;
            return currToken;
        } catch (error: any) {
            if (error?.status === 400) {
                remainingConnections = remainingConnections.filter((conn) => conn !== connString);
                await nango.log(`400 error for connection ${connString}. Retrying with next connection.`, {
                    level: 'warn'
                });
            } else {
                throw error;
            }
        }
    }

    throw new Error('All connections failed with 400 errors.');
}
