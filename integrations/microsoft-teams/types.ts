interface OrganizationUnit {
    id: string;
    deletedDateTime: string | null;
    classification: string | null;
    createdDateTime: string;
    creationOptions: string[];
    description: string | null;
    displayName: string;
    expirationDateTime: string | null;
    groupTypes: string[];
    isAssignableToRole: string | null;
    mail: string;
    mailEnabled: boolean;
    mailNickname: string;
    membershipRule: string | null;
    membershipRuleProcessingState: string | null;
    onPremisesDomainName: string | null;
    onPremisesLastSyncDateTime: string | null;
    onPremisesNetBiosName: string | null;
    onPremisesSamAccountName: string | null;
    onPremisesSecurityIdentifier: string | null;
    onPremisesSyncEnabled: boolean | null;
    preferredDataLocation: string | null;
    preferredLanguage: string | null;
    proxyAddresses: string[];
    renewedDateTime: string;
    resourceBehaviorOptions: string[];
    resourceProvisioningOptions: string[];
    securityEnabled: boolean;
    securityIdentifier: string;
    theme: string | null;
    visibility: string;
    serviceProvisioningErrors: {
        createdDateTime?: string;
        isResolved?: boolean;
        serviceInstance?: string;
    }[];
    onPremisesProvisioningErrors: {
        category?: string;
        occurredDateTime?: string;
        propertyCausingError?: string;
        value?: string;
    }[];
}

interface DirectoryUser {
    '@odata.type': string;
    id: string;
    businessPhones: string[];
    displayName: string;
    givenName: string;
    jobTitle: string | null;
    mail: string;
    mobilePhone: string | null;
    officeLocation: string | null;
    preferredLanguage: string;
    surname: string;
    userPrincipalName: string;
    deletedDateTime?: string;
    createdDateTime?: string;
    userType: string;
    accountEnabled: boolean;
    department: string | null;
}

export interface DirectoryUsersResponse {
    '@odata.context': string;
    '@odata.nextLink'?: string;
    value: DirectoryUser[];
}

export interface OrganizationUnitResponse {
    '@odata.context': string;
    value: OrganizationUnit[];
    '@odata.nextLink'?: string;
}

export interface TeamsMessageResponse {
    id: string;
    body?: {
        content?: string;
    };
    createdDateTime: string;
    lastModifiedDateTime: string;
    deletedDateTime?: string;
    from?: {
        user?: {
            id?: string;
            displayName?: string;
            email?: string;
        };
    };
    importance?: string;
    messageType: string;
    subject?: string;
    webUrl?: string;
    attachments?: TeamsAttachment[];
    reactions?: TeamsReaction[];
    replies?: TeamsReply[];
}

export interface TeamsAttachment {
    id: string;
    contentType: string;
    contentUrl?: string;
    name?: string;
    thumbnailUrl?: string;
}

export interface TeamsReaction {
    reactionType: string;
    createdDateTime: string;
    user: {
        id: string;
        displayName?: string;
        email?: string;
    };
}

export interface TeamsReply {
    id: string;
    body?: {
        content?: string;
    };
    createdDateTime: string;
    from?: {
        user?: {
            id?: string;
            displayName?: string;
            email?: string;
        };
    };
}

export interface Team {
    id: string;
    createdDateTime: string | null;
    displayName: string;
    description: string | null;
    internalId: string | null;
    classification: string | null;
    specialization: string | null;
    visibility: string | null;
    webUrl: string | null;
    isArchived: boolean;
    tenantId: string;
    isMembershipLimitedToOwners: boolean | null;
    memberSettings: {
        allowCreateUpdateChannels: boolean;
        allowDeleteChannels: boolean;
        allowAddRemoveApps: boolean;
        allowCreateUpdateRemoveConnectors: boolean;
        allowCreateUpdateRemoveTabs: boolean;
    } | null;
    guestSettings: {
        allowCreateUpdateChannels: boolean;
        allowDeleteChannels: boolean;
        allowAddRemoveApps: boolean;
        allowCreateUpdateRemoveConnectors: boolean;
        allowCreateUpdateRemoveTabs: boolean;
    } | null;
    messagingSettings: {
        allowUserEditMessages: boolean;
        allowUserDeleteMessages: boolean;
        allowOwnerDeleteMessages: boolean;
        allowTeamMentions: boolean;
        allowChannelMentions: boolean;
    } | null;
    funSettings: {
        allowGiphy: boolean;
        giphyContentRating: string;
        allowStickersAndMemes: boolean;
        allowCustomMemes: boolean;
    } | null;
    discoverySettings: {
        showInTeamsSearchAndSuggestions: boolean;
        showInOrgWeaver: boolean;
    } | null;
    tagSettings: {
        allowCreateUpdateChannels: boolean;
        allowDeleteChannels: boolean;
        allowAddRemoveApps: boolean;
        allowCreateUpdateRemoveConnectors: boolean;
        allowCreateUpdateRemoveTabs: boolean;
    } | null;
    summary: string | null;
}

export interface Channel {
    id: string;
    createdDateTime: string;
    displayName: string;
    description: string | null;
    isFavoriteByDefault: boolean | null;
    email: string | null;
    tenantId: string;
    webUrl: string | null;
    membershipType: string;
    isArchived: boolean;
}

export interface Chat {
    id: string;
    topic: string | null;
    createdDateTime: string;
    lastUpdatedDateTime: string;
    chatType: string;
    webUrl: string | null;
    tenantId: string;
    isHiddenForAllMembers: boolean;
    onlineMeetingInfo: {
        joinWebUrl: string | null;
        joinMeetingId: string | null;
        meetingId: string | null;
    } | null;
    viewpoint: {
        isHidden: boolean;
        lastMessageReadDateTime: string;
    };
    members?: {
        id: string;
        displayName: string | null;
        email: string | null;
        role: string;
        isOnlineMeetingOrganizer: boolean;
        isFavoriteByDefault: boolean;
    }[];
}
