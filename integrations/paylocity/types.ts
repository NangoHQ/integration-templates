export interface PaylocityUser {
    employeeId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    priorLastName?: string;
    salutation?: string;
    suffix?: string;
    birthDate?: string;
    gender?: string;
    ethnicity?: string;
    maritalStatus?: string;
    ssn?: string;
    status?: Status;
    companyName?: string;
    currency?: string;
    ownerPercent?: number;
    isHighlyCompensated?: boolean;
    isSmoker?: boolean;
    disabilityDescription?: string;
    veteranDescription?: string;
    webTime?: WebTime;
    workEligibility?: WorkEligibility;
    primaryPayRate?: PrimaryPayRate;
    additionalRate?: AdditionalRate[];
    departmentPosition?: DepartmentPosition;
    homeAddress?: Address;
    workAddress?: WorkAddress;
    emergencyContacts?: EmergencyContact[];
    federalTax?: FederalTax;
    localTax?: LocalTax[];
    primaryStateTax?: StateTax;
    nonPrimaryStateTax?: StateTax;
    mainDirectDeposit?: DirectDeposit;
    additionalDirectDeposit?: DirectDeposit[];
    benefitSetup?: BenefitSetup;
    customBooleanFields?: CustomField<boolean>[];
    customDateFields?: CustomField<string>[];
    customDropDownFields?: CustomField<string>[];
    customNumberFields?: CustomField<number>[];
    customTextFields?: CustomField<string>[];
}

export interface PaylocityUsersResp {
    employeeId: string;
    statusCode?: string;
    statusTypeCode?: string;
}

export interface Status {
    adjustedSeniorityDate?: string;
    changeReason?: string;
    effectiveDate?: string;
    employeeStatus?: string;
    hireDate?: string;
    isEligibleForRehire?: boolean;
    reHireDate?: string;
}

export interface WebTime {
    badgeNumber?: string;
    chargeRate?: number;
    isTimeLaborEnabled?: boolean;
}

export interface WorkEligibility {
    alienOrAdmissionDocumentNumber?: string;
    attestedDate?: string;
    countryOfIssuance?: string;
    foreignPassportNumber?: string;
    i94AdmissionNumber?: string;
    i9DateVerified?: string;
    i9Notes?: string;
    isI9Verified?: boolean;
    isSsnVerified?: boolean;
    ssnDateVerified?: string;
    ssnNotes?: string;
    visaType?: string;
    workAuthorization?: string;
    workUntil?: string;
}

export interface PrimaryPayRate {
    annualSalary?: number;
    baseRate?: number;
    beginCheckDate?: string;
    changeReason?: string;
    defaultHours?: number;
    effectiveDate?: string;
    isAutoPay?: boolean;
    payFrequency?: string;
    payGrade?: string;
    payRateNote?: string;
    payType?: string;
    ratePer?: string;
    salary?: number;
}

export interface AdditionalRate {
    changeReason?: string;
    costCenter1?: string;
    costCenter2?: string;
    costCenter3?: string;
    effectiveDate?: string;
    endCheckDate?: string;
    job?: string;
    rate?: number;
    rateCode?: string;
    rateNotes?: string;
    ratePer?: string;
    shift?: string;
}

export interface DepartmentPosition {
    changeReason?: string;
    clockBadgeNumber?: string;
    costCenter1?: string;
    costCenter2?: string;
    costCenter3?: string;
    effectiveDate?: string;
    employeeType?: string;
    equalEmploymentOpportunityClass?: string;
    isMinimumWageExempt?: boolean;
    isOvertimeExempt?: boolean;
    isSupervisorReviewer?: boolean;
    isUnionDuesCollected?: boolean;
    isUnionInitiationCollected?: boolean;
    jobTitle?: string;
    payGroup?: string;
    positionCode?: string;
    reviewerCompanyNumber?: string;
    reviewerEmployeeId?: string;
    shift?: string;
    supervisorCompanyNumber?: string;
    supervisorEmployeeId?: string;
    tipped?: string;
    unionAffiliationDate?: string;
    unionCode?: string;
    unionPosition?: string;
    workersCompensation?: string;
}

export interface Address {
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    county?: string;
    emailAddress?: string;
    mobilePhone?: string;
    phone?: string;
    postalCode?: string;
    state?: string;
}

export interface WorkAddress extends Address {
    location?: string;
    mailStop?: string;
    pager?: string;
    phoneExtension?: string;
}

export interface EmergencyContact {
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    county?: string;
    email?: string;
    firstName?: string;
    homePhone?: string;
    lastName?: string;
    mobilePhone?: string;
    notes?: string;
    pager?: string;
    primaryPhone?: string;
    priority?: string;
    relationship?: string;
    state?: string;
    syncEmployeeInfo?: boolean;
    workExtension?: string;
    workPhone?: string;
    zip?: string;
}

export interface FederalTax {
    amount?: number;
    exemptions?: number;
    filingStatus?: string;
    percentage?: number;
    taxCalculationCode?: string;
}

export interface LocalTax {
    exemptions?: number;
    exemptions2?: number;
    filingStatus?: string;
    residentPSD?: string;
    taxCode?: string;
    workPSD?: string;
}

export interface StateTax {
    amount?: number;
    exemptions?: number;
    exemptions2?: number;
    filingStatus?: string;
    percentage?: number;
    reciprocityCode?: string;
    specialCheckCalc?: string;
    taxCalculationCode?: string;
    taxCode?: string;
}

export interface DirectDeposit {
    accountNumber?: string;
    accountType?: string;
    amount?: number;
    amountType?: string;
    blockSpecial?: boolean;
    isSkipPreNote?: boolean;
    nameOnAccount?: string;
    preNoteDate?: string;
    routingNumber?: string;
}

export interface BenefitSetup {
    benefitClass?: string;
    benefitClassEffectiveDate?: string;
    benefitSalary?: number;
    benefitSalaryEffectiveDate?: string;
    doNotApplyAdministrativePeriod?: boolean;
    isMeasureAcaEligibility?: boolean;
}

export interface CustomField<T> {
    category?: string;
    label?: string;
    value: T;
}
