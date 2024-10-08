export interface HubspotUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    primaryTeamId?: string;
    superAdmin: boolean;
}

export interface HubspotCompany {
    id: string;
    properties: {
        createdate: string;
        domain: string;
        hs_lastmodifieddate: string;
        hs_object_id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

export interface HubspotAccountInformation {
    portalId: number;
    accountType: string;
    timeZone: string;
    companyCurrency: string;
    additionalCurrencies: string[];
    utcOffset: string;
    utcOffsetMilliseconds: number;
    uiDomain: string;
    dataHostingLocation: string;
}

export interface HubspotCurrencyCodeResponse {
    results: HubspotCompanyCode[];
}

export interface HubspotCompanyCode {
    currencyCode: string;
    currencyName: string;
}
