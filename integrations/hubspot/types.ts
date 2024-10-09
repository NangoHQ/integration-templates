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

export interface HubspotCompanyResponse {
    id: string;
    properties: {
        createdate: string;
        domain: string;
        hs_lastmodifieddate: string;
        hs_object_id: string;
        hs_object_source: string;
        hs_object_source_id: string;
        hs_object_source_label: string;
        hs_pipeline: string;
        lifecyclestage: string;
        name: string;
        website: string;
    };
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

export interface HubspotContactResponse {
    id: string;
    properties: {
        createdate: string;
        email?: string;
        firstname?: string;
        lastname?: string;
        hs_all_contact_vids: string;
        hs_currently_enrolled_in_prospecting_agent: string;
        hs_email_domain: string;
        hs_is_contact: string;
        hs_is_unworked: string;
        hs_lifecyclestage_lead_date: string;
        hs_membership_has_accessed_private_content: string;
        hs_object_id: string;
        hs_object_source: string;
        hs_object_source_id: string;
        hs_object_source_label: string;
        hs_pipeline: string;
        hs_registered_member: string;
        lastmodifieddate: string;
        lifecyclestage: string;
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

export interface Association {
    id: string;
    type: string;
}

export interface HubspotContact {
    id: string;
    properties: {
        createdate: string;
        email: string;
        firstname: string;
        hs_object_id: string;
        lastmodifieddate: string;
        lastname: string;
    };
    createdAt: string;
    updatedAt: string;
    archived: boolean;
    associations?: {
        companies?: {
            results: Association[];
        };
    };
}

export interface DealLineItemAssociationResponse {
    results: Association[];
}
