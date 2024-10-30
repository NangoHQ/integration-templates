export interface TrelloUser {
    accountId: string;
    accountType: string;
    active: boolean;
    applicationRoles: ApplicationRoles;
    avatarUrls: AvatarUrls;
    displayName: string;
    emailAddress: string;
    groups: Groups;
    key: string;
    name: string;
    self: string;
    timeZone: string;
}

interface ApplicationRoles {
    items: any[];
    size: number;
}

interface AvatarUrls {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
}

interface Groups {
    items: any[];
    size: number;
}
// TODO: update anys
