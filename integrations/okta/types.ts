type GroupProfile = OktaUserGroupProfile | OktaActiveDirectoryGroupProfile;

export interface OktaGroup {
    created: string;
    id: string;
    lastMembershipUpdated: string;
    lastUpdated: string;
    objectClass: string[];
    profile: GroupProfile;
    description: string | null;
    name: string;
    type: GroupType;
    _embedded?: Record<string, any>;
    _links: GroupLinks;
}

enum GroupType {
    APP_GROUP = 'APP_GROUP',
    BUILT_IN = 'BUILT_IN',
    OKTA_GROUP = 'OKTA_GROUP'
}

export interface OktaUserGroupProfile {
    description: string | null;
    name: string;
}

export interface OktaActiveDirectoryGroupProfile {
    description: string | null;
    dn: string;
    externalId: string;
    name: string;
    samAccountName: string;
    windowsDomainQualifiedName: string;
}

interface GroupLinks {
    self: LinkObject;
    apps?: LinkObject;
    logo?: LinkObject[];
    source?: LinkObject;
    users?: LinkObject;
}

interface LinkObject {
    href: string;
    hints?: {
        allow: 'DELETE' | 'GET' | 'POST' | 'PUT';
    };
    name?: string;
    templated?: boolean;
    type?: string;
    [key: string]: any;
}

export interface CreateOktaGroup {
    profile: Partial<OktaGroup>;
}

export interface CreateOktaUser {
    profile: Partial<OktaUserProfile>;
}

export interface OktaUserProfile {
    firstName: string | null;
    lastName: string | null;
    mobilePhone: string | null;
    secondEmail: string | null;
    login: string;
    email: string;
    city?: string | null;
    costCenter?: string | null;
    countryCode?: string | null;
    department?: string;
    displayName?: string | null;
    division?: string | null;
    employeeNumber?: string;
    honorificPrefix?: string | null;
    honorificSuffix?: string | null;
    locale?: string;
    manager?: string | null;
    managerId?: string | null;
    middleName?: string | null;
    nickName?: string | null;
    organization?: string | null;
    postalAddress?: string | null;
    preferredLanguage?: string | null;
    primaryPhone?: string | null;
    profileUrl?: string | null;
    state?: string | null;
    streetAddress?: string | null;
    timezone?: string | null;
    title?: string | null;
    userType?: string | null;
    zipCode?: string | null;
}

export interface OktaUserCredential {
    password?: {
        hash: {
            algorithm: 'BCRYPT' | 'MD5' | 'PBKDF2' | 'SHA-1' | 'SHA-256' | 'SHA-512';
            digestAlgorithm: 'SHA256_HMAC' | 'SHA512_HMAC';
            iterationCount: number;
            keySize: number;
            salt: string;
            saltOrder: string;
            value: string;
            workFactor: number;
        };
        hook: {
            type: string;
        };
        value?: string;
    };
    provider: {
        type: 'ACTIVE_DIRECTORY' | 'FEDERATION' | 'IMPORT' | 'LDAP' | 'OKTA' | 'SOCIAL';
        name: string;
    };
    recovery_question?: {
        question: string;
        answer?: string;
    };
}

export interface OktaUser {
    id: string;
    status: 'ACTIVE' | 'DEPROVISIONED' | 'LOCKED_OUT' | 'PASSWORD_EXPIRED' | 'PROVISIONED' | 'RECOVERY' | 'STAGED' | 'SUSPENDED';
    created: string;
    activated: string;
    statusChanged: string;
    transitioningToStatus: string;
    lastLogin: string | null;
    lastUpdated: string;
    passwordChanged: string | null;
    realmId?: string;
    groupIds?: string[];
    type: {
        id: string;
    };
    profile: OktaUserProfile;
    credentials: OktaUserCredential;
    _embedded: object;
    _links: UserLinks;
}

interface UserLinks {
    self?: LinkObject;
    activate?: LinkObject;
    resetPassword?: LinkObject;
    resetFactors?: LinkObject;
    expirePassword?: LinkObject;
    forgetPassword?: LinkObject;
    changerecoveryQuestion?: LinkObject;
    deactivate?: LinkObject;
    reactivate?: LinkObject;
    changePassword?: LinkObject;
    schema?: LinkObject;
    suspend?: LinkObject;
    unsuspend?: LinkObject;
    unlock?: LinkObject;
    type?: LinkObject;
}
