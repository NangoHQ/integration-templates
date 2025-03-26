import type { NangoAction, DriveList } from '../../models';
import type { DriveResponse } from '../types';
import { toDrive } from '../mappers/to-drive.js';

/**
 * Lists the available drives for the authenticated user.
 * @param nango - The NangoAction instance.
 * @returns A Promise that resolves with the DriveList.
 */
export default async function runAction(nango: NangoAction): Promise<DriveList> {
    const response = await nango.get<DriveResponse>({
        // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
        endpoint: '/v1.0/me/drives',
        retries: 3
    });

    const { value: drives } = response.data;
    const mappedDrives = drives.map((drive) => toDrive(drive));

    return {
        drives: mappedDrives
    };
}
