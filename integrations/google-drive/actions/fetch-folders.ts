import type { FetchFoldersInput, GoogleDriveFolder, NangoAction, ProxyConfiguration } from '../../models';

/**
 * Lists folders in Google Drive.
 * If a folder ID is provided, it lists folders within that folder.
 * Otherwise, it lists folders in the root directory.
 *
 * @param nango - An instance of NangoAction.
 * @param input - Optional parameters including folderId, and pageToken.
 * @returns A list of folders and a nextPageToken if more results are available.
 */
export default async function runAction(nango: NangoAction, input: FetchFoldersInput = {}): Promise<GoogleDriveFolder> {
    let query = "mimeType='application/vnd.google-apps.folder'";

    if (input.id) {
        query += ` and '${input.id}' in parents`;
    } else {
        query += " and 'root' in parents";
    }

    const config: ProxyConfiguration = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/list
        endpoint: 'drive/v3/files',
        params: {
            q: query,
            fields: 'files(id,name,mimeType,createdTime,modifiedTime,parents,webViewLink),nextPageToken',
            pageSize: 100,
            pageToken: input.nextPageToken || '',
            supportsAllDrives: 'true', // Whether the requesting application supports both My Drives and shared drives
            includeItemsFromAllDrives: 'true', // both My Drive and shared drive items
            orderBy: 'name'
        },
        retries: 10
    };

    const response = await nango.get(config);

    if (response.status !== 200) {
        throw new Error(`Failed to list folders: Status Code ${response.status}`);
    }
    return {
        folders: response.data.files || [],
        nextPageToken: response.data.nextPageToken
    };
}
