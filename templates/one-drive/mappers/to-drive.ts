import type { Drive as DriveModel } from '../models.js';
import type { Drive } from '../types.js';

/**
 * Maps a Drive from the OneDrive API to the standardized Drive format
 * @param drive - The Drive from OneDrive API
 * @returns The mapped Drive object
 */
export function toDrive(drive: Drive): DriveModel {
    return {
        id: drive.id,
        name: drive.name,
        createdDateTime: drive.createdDateTime,
        webUrl: drive.webUrl
    };
}
