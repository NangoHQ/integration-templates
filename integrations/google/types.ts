export interface DirectoryUsersResponse {
    kind: string;
    etag: string;
    users: DirectoryUser[];
}

interface DirectoryUser {
    kind: string;
    id: string;
    etag: string;
    primaryEmail: string;
    name: Name;
    isAdmin: boolean;
    isDelegatedAdmin: boolean;
    lastLoginTime: string;
    creationTime: string;
    deletionTime?: string;
    agreedToTerms: boolean;
    suspended: boolean;
    archived: boolean;
    changePasswordAtNextLogin: boolean;
    ipWhitelisted: boolean;
    emails: Email[];
    languages: Language[];
    aliases?: string[];
    nonEditableAliases?: string[];
    customerId: string;
    orgUnitPath: string;
    isMailboxSetup: boolean;
    isEnrolledIn2Sv: boolean;
    isEnforcedIn2Sv: boolean;
    includeInGlobalAddressList: boolean;
    thumbnailPhotoUrl?: string;
    thumbnailPhotoEtag?: string;
    recoveryEmail?: string;
    recoveryPhone?: string;
    phones?: Phone[];
}

interface Name {
    givenName: string;
    familyName: string;
    fullName: string;
}

interface Email {
    address: string;
    type: string;
    primary?: boolean;
}

interface Language {
    languageCode: string;
    preference: string;
}

interface Phone {
    value: string;
    type: string;
    customType?: string;
}
