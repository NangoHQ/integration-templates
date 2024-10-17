export interface DocuSignUser {
    userName: string;
    userId: string;
    userType: string;
    isAdmin: string;
    isAlternateAdmin: string;
    userStatus: string;
    uri: string;
    email: string;
    title: string;
    createdDateTime: string;
    userAddedToAccountDateTime: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffixName: string;
    jobTitle: string;
    company: string;
    permissionProfileId: string;
    permissionProfileName: string;
}

export interface UserInfoResponse {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    created: string;
    email: string;
    accounts: AccountInfo[];
}

interface AccountInfo {
    account_id: string;
    is_default: boolean;
    account_name: string;
    base_uri: string;
    organization: OrganizationInfo;
}

interface OrganizationInfo {
    organization_id: string;
    links: OrgLinkInfo[];
}

interface OrgLinkInfo {
    rel: string;
    href: string;
}
