export interface GoogleDriveFileResponse {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    modifiedTime: string;
    size: string;
}

export interface Metadata {
    files?: string[];
    folders?: string[];
}

interface MimeTypeMapping {
    mimeType: string;
    responseType: 'text' | 'stream';
}

export const mimeTypeMapping: Record<string, MimeTypeMapping> = {
    // Documents
    'application/vnd.google-apps.document': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', responseType: 'text' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        responseType: 'stream'
    },
    'application/vnd.oasis.opendocument.text': { mimeType: 'application/vnd.oasis.opendocument.text', responseType: 'stream' },
    'application/rtf': { mimeType: 'application/rtf', responseType: 'stream' },
    'text/plain': { mimeType: 'text/plain', responseType: 'stream' },
    // Spreadsheets
    'application/vnd.google-apps.spreadsheet': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', responseType: 'text' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        responseType: 'stream'
    },
    'application/vnd.oasis.opendocument.spreadsheet': { mimeType: 'application/vnd.oasis.opendocument.spreadsheet', responseType: 'stream' },
    // PDFs
    'application/pdf': { mimeType: 'application/pdf', responseType: 'stream' },
    // Text Files
    'text/csv': { mimeType: 'text/csv', responseType: 'text' },
    'text/tab-separated-values': { mimeType: 'text/tab-separated-values', responseType: 'text' },
    // Presentations
    'application/vnd.google-apps.presentation': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', responseType: 'text' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        responseType: 'stream'
    },
    'application/vnd.oasis.opendocument.presentation': { mimeType: 'application/vnd.oasis.opendocument.presentation', responseType: 'stream' },
    // Drawings and Images
    'application/vnd.google-apps.drawing': { mimeType: 'image/jpeg', responseType: 'stream' },
    'image/jpeg': { mimeType: 'image/jpeg', responseType: 'stream' },
    'image/png': { mimeType: 'image/png', responseType: 'stream' },
    'image/svg+xml': { mimeType: 'image/svg+xml', responseType: 'stream' },
    // markdown
    'text/markdown': { mimeType: 'text/markdown', responseType: 'stream' }
};

export interface DriveCapabilities {
    canAddChildren?: boolean;
    canComment?: boolean;
    canCopy?: boolean;
    canDeleteDrive?: boolean;
    canDownload?: boolean;
    canEdit?: boolean;
    canListChildren?: boolean;
    canManageMembers?: boolean;
    canReadRevisions?: boolean;
    canRename?: boolean;
    canShare?: boolean;
    canTrashChildren?: boolean;
    canRenameDrive?: boolean;
    canChangeDriveBackground?: boolean;
    canChangeCopyRequiresWriterPermissionRestriction?: boolean;
    canChangeDomainUsersOnlyRestriction?: boolean;
    canChangeDriveMembersOnlyRestriction?: boolean;
    canChangeSharingFoldersRequiresOrganizerPermissionRestriction?: boolean;
    canResetDriveRestrictions?: boolean;
    canDeleteChildren?: boolean;
}

export interface DriveRestrictions {
    adminManagedRestrictions?: boolean;
    copyRequiresWriterPermission?: boolean;
    domainUsersOnly?: boolean;
    driveMembersOnly?: boolean;
    sharingFoldersRequiresPublisherPermission?: boolean;
    sharingFoldersRequiresOrganizerPermission?: boolean;
}

export interface Drive {
    id: string;
    name: string;
    kind: string;
    createdTime: string;
    hidden?: boolean;
    capabilities?: DriveCapabilities;
    restrictions?: DriveRestrictions;
}

export interface DriveListResponse {
    drives: Drive[];
    cursor?: string | undefined;
    kind: string;
}

export interface ListDrivesInput {
    cursor?: string;
}
