import type { NangoSync } from '../../models';

export function rotateConnections(connectionIds: string[], nango: NangoSync): string {
    if (connectionIds.length === 0) {
        throw new nango.ActionError({
            message: 'ConnectionIds array is empty'
        });
    }

    const connection = connectionIds[0] ?? '';
    connectionIds.push(connectionIds.shift()!);
    return connection;
}
