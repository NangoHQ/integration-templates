export interface DropboxUser {
    profile: {
        account_id: string;
        email: string;
        email_verified: boolean;
        external_id: string;
        groups: string[];
        joined_on: string;
        member_folder_id: string;
        membership_type: {
            '.tag': string;
        };
        name: {
            abbreviated_name: string;
            display_name: string;
            familiar_name: string;
            given_name: string;
            surname: string;
        };
        profile_photo_url: string;
        root_folder_id: string;
        secondary_emails: {
            email: string;
            is_verified: boolean;
        }[];
        status: {
            '.tag': string;
        };
        team_member_id: string;
    };
    roles: {
        description: string;
        name: string;
        role_id: string;
    }[];
}

export interface DropboxUserResponse {
    cursor: string;
    has_more: boolean;
    members: DropboxUser[];
}

interface MembershipType {
    '.tag': string;
}

interface Name {
    abbreviated_name: string;
    display_name: string;
    familiar_name: string;
    given_name: string;
    surname: string;
}

interface SecondaryEmail {
    email: string;
    is_verified: boolean;
}

interface Status {
    '.tag': string;
}

interface Profile {
    account_id: string;
    email: string;
    email_verified: boolean;
    external_id: string;
    groups: string[];
    joined_on: string;
    member_folder_id: string;
    membership_type: MembershipType;
    name: Name;
    profile_photo_url: string;
    root_folder_id: string;
    secondary_emails: SecondaryEmail[];
    status: Status;
    team_member_id: string;
}

interface Role {
    description: string;
    name: string;
    role_id: string;
}

interface CompleteItem {
    '.tag': string;
    profile: Profile;
    roles: Role[];
}

export interface DropboxCreatedUser {
    '.tag': string;
    complete: CompleteItem[];
}


export interface DropboxFile {
    '.tag': string;
    name: string;
    path_lower: string;
    path_display: string;
    id?: string;
    client_modified?: string;
    server_modified?: string;
    rev?: string;
    size?: number;
    is_downloadable?: boolean;
    content_hash?: string;
}


export interface DropboxTemporaryDownloadLink {
    metadata: DropboxFile;
    link: string;
}


export interface DropboxFileList {
    entries: DropboxFile[];
    has_more: boolean;
    cursor: string;
}