// Helper types for excluding undefined or null
type NonUndefined<T> = {
    [K in keyof T]-?: Exclude<T[K], undefined>;
};

type NonNull<T> = {
    [K in keyof T]-?: Exclude<T[K], null>;
};

// Common interface for response
interface CommonResponse {
    id: string;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

// Create a NonUndefined/NonNull version for any response type
type NonNullResponse<T extends { properties: any }> = T & {
    properties: NonNull<T['properties']>;
};

type NonUndefinedResponse<T extends { properties: any }> = T & {
    properties: NonUndefined<T['properties']>;
};

// ----------------- HubSpot Contact -----------------

interface HubSpotContactProperties {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    jobtitle?: string | null;
    notes_last_contacted?: string | null;
    notes_last_updated?: string | null;
    hs_lead_status?: string | null;
    lifecyclestage?: string | null;
    salutation?: string | null;
    mobilephone?: string | null;
    website?: string | null;
    createdate?: string;
    hubspot_owner_id?: string | null;
}

// Base contact response
export interface HubSpotContact extends CommonResponse {
    properties: HubSpotContactProperties;
}

// NonUndefined and NonNull versions
export type HubSpotContactNonUndefined = NonUndefinedResponse<HubSpotContact>;
export type HubSpotContactNonNull = NonNullResponse<HubSpotContact>;

// ----------------- HubSpot Company -----------------

interface HubSpotCompanyProperties {
    name?: string | null;
    industry?: string | null;
    description?: string | null;
    country?: string | null;
    city?: string | null;
    hs_lead_status?: string | null;
    lifecyclestage?: string | null;
    hubspot_owner_id?: string | null;
    founded_year?: string | null;
    website?: string | null;
}

// Base company response
export interface HubSpotCompany extends CommonResponse {
    properties: HubSpotCompanyProperties;
}

// NonUndefined and NonNull versions
export type HubSpotCompanyNonUndefined = NonUndefinedResponse<HubSpotCompany>;
export type HubSpotCompanyNonNull = NonNullResponse<HubSpotCompany>;

// ----------------- HubSpot Deal -----------------

interface HubSpotDealProperties {
    dealname?: string | null;
    amount?: string | null;
    closedate?: string | null;
    description?: string | null;
    hubspot_owner_id?: string | null;
    dealstage?: string | null;
    hs_deal_stage_probability?: string | null;
}

interface Association {
    id: string;
    type: string;
}

// Base deal response
export interface HubSpotDeal extends CommonResponse {
    properties: HubSpotDealProperties;
    associations?:
        | {
              companies: { results: Association[] };
              contacts: { results: Association[] };
          }
        | HubspotAssociation[];
}

// NonUndefined and NonNull versions
export type HubSpotDealNonUndefined = NonUndefinedResponse<HubSpotDeal>;
export type HubSpotDealNonNull = NonNullResponse<HubSpotDeal>;

// ----------------- HubSpot Note -----------------

interface HubSpotNoteProperties {
    hs_all_owner_ids?: string;
    hs_attachment_ids?: string;
    hs_body_preview?: string;
    hs_body_preview_html?: string;
    hs_body_preview_is_truncated?: boolean;
    hs_createdate?: string;
    hs_lastmodifieddate?: string;
    hs_note_body?: string;
    hs_object_id?: string;
    hs_object_source?: string;
    hs_object_source_id?: string;
    hs_object_source_label?: string;
    hs_timestamp: string;
    hs_user_ids_of_all_owners?: string;
    hubspot_owner_assigneddate?: string;
    hubspot_owner_id?: string;
}

// Base note response
export interface HubSpotNote extends CommonResponse {
    properties: HubSpotNoteProperties;
    associations?: HubspotAssociation[];
}

// NonUndefined and NonNull versions
export type HubSpotNoteNonUndefined = NonUndefinedResponse<HubSpotNote>;
export type HubSpotNoteNonNull = NonNullResponse<HubSpotNote>;

// ----------------- HubSpot Task -----------------

interface HubSpotTaskProperties {
    hs_createdate?: string;
    hs_lastmodifieddate?: string;
    hs_object_id?: string;
    hs_task_body?: string | null;
    hs_task_priority?: string | null;
    hs_task_subject?: string | null;
    hs_task_type?: 'CALL' | 'EMAIL' | 'TODO';
    hs_timestamp?: string;
    hubspot_owner_id?: string | null;
}

// Base task response
export interface HubSpotTask extends CommonResponse {
    properties: HubSpotTaskProperties;
    associations?:
        | {
              companies: { results: Association[] };
              contacts: { results: Association[] };
              deals: { results: Association[] };
          }
        | HubspotAssociation[];
}

// NonUndefined and NonNull versions
export type HubSpotTaskNonUndefined = NonUndefinedResponse<HubSpotTask>;
export type HubSpotTaskNonNull = NonNullResponse<HubSpotTask>;

// ----------------- HubSpot Association -----------------

export interface HubspotAssociation {
    to: { id: number };
    types: {
        associationCategory: string;
        associationTypeId: number;
    }[];
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

export interface HubspotUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    primaryTeamId?: string;
    superAdmin: boolean;
}

// ----------------- HubSpot Product -----------------
export interface HubSpotProduct extends CommonResponse {
    properties: HubSpotProductProperties;
}

export interface HubSpotProductProperties {
    amount: number | null;
    createdate: string;
    description: string | null;
    discount: number | null;
    hs_lastmodifieddate: string;
    hs_object_id: string;
    hs_sku: string | null;
    hs_url: string | null;
    name: string;
    price: string;
    quantity: number | null;
    recurringbillingfrequency: number | null;
    tax: null | number;
}
