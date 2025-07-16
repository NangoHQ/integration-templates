interface IdentitySet {
    application?: Identity;
    device?: Identity;
    user?: Identity;
}

interface Identity {
    id: string;
    displayName: string;
}

interface FileFacet {
    hashes?: object;
    mimeType: string;
}

interface FileSystemInfo {
    createdDateTime: string;
    lastModifiedDateTime: string;
}

interface FolderFacet {
    childCount: number;
}

interface ItemReference {
    driveId: string;
    driveType: 'personal' | 'business' | 'documentLibrary';
    id: string;
    name: string;
    path: string;
}

export interface DriveItem {
    '@odata.context'?: string;
    '@microsoft.graph.downloadUrl'?: string;
    createdBy?: IdentitySet;
    createdDateTime: string;
    cTag: string;
    eTag: string;
    file?: FileFacet;
    fileSystemInfo?: FileSystemInfo;
    folder?: FolderFacet;
    id: string;
    lastModifiedBy?: IdentitySet;
    lastModifiedDateTime: string;
    name: string;
    parentReference?: ItemReference;
    size: number;
    webUrl?: string;
}

export interface OneDriveFetchFile {
    '@odata.context'?: string;
    id: string;
    '@microsoft.graph.downloadUrl'?: string;
}

export interface DriveResponse {
    '@odata.context': string;
    value: Drive[];
}

export interface Drive {
    createdDateTime: string;
    description?: string;
    id: string;
    lastModifiedDateTime: string;
    name: string;
    webUrl: string;
    driveType: string;
    owner?: IdentitySet;
}

export interface ItemResponse {
    '@odata.context': string;
    value: DriveItem[];
    '@odata.nextLink'?: string;
}
