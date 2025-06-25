export interface SapSuccessFactorsPerPersonResponse {
    d: {
        results: SapSuccessFactorsPerPerson[];
    };
}

export interface SapSuccessFactorsPerPerson {
    __metadata: {
        uri: string;
        type: string;
    };
    personIdExternal: string;
    userId: string;
    perPersonUuid: string;
    personId: string;
    dateOfBirth: string | null;
    countryOfBirth: string | null;
    regionOfBirth: string | null;
    birthName: string | null;
    createdDateTime: string;
    lastModifiedDateTime: string;
    personalInfoNav: SapSuccessFactorsPersonalInfo;
    emailNav: { results: SapSuccessFactorsEmail[] };
    phoneNav: { results: SapSuccessFactorsPhone[] };
    homeAddressNavDEFLT: { results: SapSuccessFactorsHomeAddress[] };
}

export interface SapSuccessFactorsPersonalInfo {
    __metadata: {
        uri: string;
        type: string;
    };
    personIdExternal: string;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    gender: string | null;
}

export interface SapSuccessFactorsEmail {
    __metadata: {
        uri: string;
        type: string;
    };
    personIdExternal: string;
    emailAddress: string;
    emailType: string;
}

export interface SapSuccessFactorsPhone {
    __metadata: {
        uri: string;
        type: string;
    };
    personIdExternal: string;
    phoneNumber: string;
    phoneType: string;
}

export interface SapSuccessFactorsHomeAddress {
    __metadata: {
        uri: string;
        type: string;
    };
    personIdExternal: string;
    address1: string | null;
    address2: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
}
