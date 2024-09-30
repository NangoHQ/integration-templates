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

interface OrganizationUnitResponse {
    '@odata.context': string;
    value: OrganizationUnit[];
    '@odata.nextLink'?: string;
}
