import type { GithubConnectionMetadata, NangoSync } from '../../models';

export function hasExceededTwentyHours(start: Date, end: Date): boolean {
    const diff = end.getTime() - start.getTime();
    const hours = diff / 1000 / 60 / 60;
    return hours > 20;
}

export async function shouldAbortSync(startTime: Date, nango: NangoSync, metadata: GithubConnectionMetadata, syncName: string, leastObjectTime: Date) {
    if (hasExceededTwentyHours(startTime, new Date())) {
        await nango.log('Sync exceeded 20 hours, stopping...');
        await nango.updateMetadata({
            ...metadata,
            lastSyncCheckPoint: {
                ...(typeof metadata.lastSyncCheckPoint === 'object' && metadata.lastSyncCheckPoint !== null ? metadata.lastSyncCheckPoint : {}),
                [syncName]: new Date(leastObjectTime).toISOString()
            }
        });
        return true;
    }
    return false;
}
