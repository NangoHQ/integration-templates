interface SharePointIds {
    listId: string;
    listItemId: string;
    listItemUniqueId: string;
    siteId: string;
    siteUrl: string;
    tenantId: string;
    webId: string;
}

interface SiteCollection {
    dataLocationCode?: string;
    hostname: string;
    root?: object;
    archivalDetails?: SiteArchivalDetails;
}
interface SiteArchivalDetails {
    archiveStatus: 'recentlyArchived' | 'fullyArchived' | 'reactivating' | 'unknownFutureValue';
}

interface IdentitySet {
    application?: Identity;
    applicationInstance?: Identity;
    conversation?: Identity;
    conversationIdentityType?: Identity;
    device?: Identity;
    encrypted?: Identity;
    onPremises?: Identity;
    guest?: Identity;
    phone?: Identity;
    user?: Identity;
}

interface Identity {
    id: string;
    displayName: string;
    tenantId?: string;
}

interface AudioFacet {
    album: string;
    albumArtist: string;
    artist: string;
    bitrate: number;
    composers: string;
    copyright: string;
    disc: number;
    discCount: number;
    duration: number;
    genre: string;
    hasDrm: boolean;
    isVariableBitrate: boolean;
    title: string;
    track: number;
    trackCount: number;
    year: number;
}
interface BundleFacet {
    album?: object;
    childCount: number;
}

interface DeletedFacet {
    state: string;
}

interface FileFacet {
    hashes?: object;
    mimeType: string;
}

interface FileSystemInfo {
    createdDateTime: string;
    lastAccessedDateTime?: string;
    lastModifiedDateTime: string;
}

interface FolderFacet {
    childCount: number;
    view: FolderView;
}

interface FolderView {
    sortBy: 'default' | 'name' | 'type' | 'size' | 'takenOrCreatedDateTime' | 'lastModifiedDateTime' | 'sequence';
    sortOrder: 'ascending' | 'descending';
    viewType: 'default' | 'icons' | 'details' | 'thumbnails';
}

interface ImageFacet {
    height?: number;
    width?: number;
}

interface GeoCoordinates {
    altitude?: number;
    latitude?: number;
    longitude?: number;
}

interface MalwareFacet {
    description: string;
}

interface PackageFacet {
    type: string;
}

interface ItemReference {
    driveId: string;
    driveType: 'personal' | 'business' | 'documentLibrary';
    id: string;
    name: string;
    path: string;
    shareId: string;
    sharepointIds: SharePointIds;
    siteId: string;
}

interface PendingOperations {
    pendingContentUpdate: object;
}

interface PhotoFacet {
    cameraMake: string;
    cameraModel: string;
    exposureDenominator: number;
    exposureNumerator: number;
    fNumber: number;
    focalLength: number;
    iso: number;
    orientation: number;
    takenDateTime: string;
}

interface PublicationFacet {
    level: 'published' | 'checkout';
    versionId: string;
    checkedOutBy: IdentitySet;
}

interface RemoteItemFacet {
    level: 'published' | 'checkout';
    versionId: string;
    checkedOutBy: IdentitySet;
}

interface SearchResultFacet {
    onClickTelemetryUrl: string;
}

interface SharedFacet {
    owner: IdentitySet;
    sharedBy: IdentitySet;
    sharedDateTime: string;
}

interface SpecialFolderFacet {
    name: string;
}

interface VideoFacet {
    audioBitsPerSample: number;
    audioChannels: number;
    audioFormat: string;
    audioSamplesPerSecond: number;
    bitrate: number;
    duration: number;
    fourCC: string;
    frameRate: number;
    height: number;
    width: number;
}

export interface SharePointSite {
    createdDateTime: string;
    description?: string;
    displayName?: string;
    eTag?: string;
    id: string;
    isPersonalSite?: boolean;
    lastModifiedDateTime: string;
    name: string;
    root?: object;
    sharepointIds?: SharePointIds;
    siteCollection?: SiteCollection;
    webUrl: string;
}

export interface DriveItem {
    '@odata.context': string;
    '@microsoft.graph.downloadUrl': string;
    '@microsoft.graph.Decorator': string;
    audio?: AudioFacet;
    bundle?: BundleFacet;
    content?: any;
    createdBy: IdentitySet;
    createdDateTime: string;
    cTag: string;
    deleted?: DeletedFacet;
    description?: string;
    eTag: string;
    file?: FileFacet;
    fileSystemInfo?: FileSystemInfo;
    folder?: FolderFacet;
    id: string;
    image?: ImageFacet;
    lastModifiedBy: IdentitySet;
    lastModifiedDateTime: string;
    location?: GeoCoordinates;
    malware?: MalwareFacet;
    name: string;
    package?: PackageFacet;
    parentReference: ItemReference;
    pendingOperations?: PendingOperations;
    photo?: PhotoFacet;
    publication?: PublicationFacet;
    remoteItem?: RemoteItemFacet;
    root?: object;
    searchResult?: SearchResultFacet;
    shared?: SharedFacet;
    sharepointIds?: SharePointIds;
    size: number;
    specialFolder?: SpecialFolderFacet;
    video?: VideoFacet;
    webDavUrl?: string;
    webUrl?: string;
}

export interface SharepointFetchFile {
    '@odata.context': string;
    id: string;
    '@microsoft.graph.downloadUrl'?: string;
}

export interface DriveResponse {
    '@odata.context': string;
    value: Drive[];
}

interface Drive {
    createdDateTime: string;
    description: string;
    id: string;
    lastModifiedDateTime: string;
    name: string;
    webUrl: string;
    driveType: string;
    createdBy: CreatedBy;
    lastModifiedBy: UserInfo;
    owner: UserInfo;
    quota: Quota;
}

interface CreatedBy {
    user: User;
}

interface UserInfo {
    user: User;
}

interface User {
    displayName: string;
    email?: string;
    id?: string;
}

interface Quota {
    deleted: number;
    remaining: number;
    state: string;
    total: number;
    used: number;
}

export interface ItemResponse {
    '@odata.context': string;
    value: DriveItemFromItemResponse[];
}

export interface DriveItemFromItemResponse {
    '@microsoft.graph.downloadUrl'?: string;
    createdBy: CreatedByOrModifiedBy;
    createdDateTime: string;
    eTag: string;
    id: string;
    lastModifiedBy: CreatedByOrModifiedBy;
    lastModifiedDateTime: string;
    name: string;
    parentReference: ParentReference;
    webUrl: string;
    cTag: string;
    fileSystemInfo: FileSystemInfo;
    folder?: Folder;
    file?: File;
    specialFolder?: SpecialFolder;
    size: number;
}

interface CreatedByOrModifiedBy {
    application?: Application;
    user: User;
}

interface Application {
    id: string;
    displayName: string;
}

interface ParentReference {
    driveType: string;
    driveId: string;
    id: string;
    name: string;
    path: string;
    siteId: string;
}

interface FileSystemInfo {
    createdDateTime: string;
    lastModifiedDateTime: string;
}

interface Folder {
    childCount: number;
}

interface File {
    hashes: Hashes;
    mimeType: string;
}

interface Hashes {
    quickXorHash: string;
}

interface SpecialFolder {
    name: string;
}
