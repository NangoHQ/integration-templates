import { createAction } from 'nango';
import type { DriveResponse } from '../types.js';
import { toDrive } from '../mappers/to-drive.js';

import { DriveList } from '../models.js';
import { z } from 'zod';

/**
 * Lists the available drives for the authenticated user.
 * @param nango - The NangoAction instance.
 * @returns A Promise that resolves with the DriveList.
 */
const action = createAction({
    description: 'Lists the available drives for the authenticated user.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/list-drives',
        group: 'Drives'
    },

    input: z.void(),
    output: DriveList,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango): Promise<DriveList> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
