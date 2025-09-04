export interface Field {
    id: string | number;
    name: string;
    type: string;
    alias?: string;
}

export interface Option {
    id: number;
    archived: string;
    createdDate: string | null;
    archivedDate: string | null;
    name: string;
}

export interface ListField {
    fieldId: number;
    manageable: string;
    multiple: string;
    name: string;
    options: Option[];
    alias?: string;
}

export interface BambooHrEmployee {
    // Core employee fields
    employeeNumber?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    addressLineOne?: string;
    email?: string; // Work Email
    jobInformationJobTitle?: string;
    hireDate?: string;
    supervisorId?: string;
    supervisorName?: string;
    createdByUserId?: string;
    jobInformationDepartment?: string;
    jobInformationDivision?: string;
    employmentStatus?: string;
    gender?: string;
    country?: string;
    city?: string;
    jobInformationLocation?: string;
    state?: string;
    maritalStatus?: string;
    payBand?: string;
    compensationPayType?: string;
    compensationPaySchedule?: string;
    workPhone?: string;
    homePhone?: string;
    
    // Additional useful fields from the dataset
    middleName?: string;
    preferredName?: string;
    employeePronouns?: string;
    citizenship?: string;
    nationality?: string;
    ethnicity?: string;
    veteranStatus?: string;
    flsaCode?: string;
    eeoJobCategory?: string;
    standardHoursPerWeek?: string;
    team?: string;
    originalHireDate?: string;
    fullTimeDate?: string;
    probationEndDate?: string;
    contractEndDate?: string;
    noticePeriod?: string;
    eligibleForRehire?: string;
    lengthOfService?: string;
    lengthOfServiceYears?: string;
    isSupervisor?: string;
    supervisorEmail?: string;
    supervisorEid?: string;
    
    // Compensation fields
    compensationPayRate?: string;
    compensationPayRateCurrencyCode?: string;
    compensationOvertimeRate?: string;
    compensationOvertimeRateCurrencyCode?: string;
    compensationOvertimeStatus?: string;
    compensationPaidPer?: string;
    compensationEffectiveDate?: string;
    compensationChangeReason?: string;
    compensationComments?: string;
    
    // Employment status details
    employmentStatusFTE?: string;
    employmentStatusComment?: string;
    employmentStatusEffectiveDate?: string;
    employmentStatusEmployeeTaxType?: string;
    employmentStatusFinalPayDate?: string;
    employmentStatusRegrettableOrNonRegrettable?: string;
    employmentStatusTerminationReason?: string;
    employmentStatusTerminationType?: string;
    preTerminationEmploymentStatus?: string;
    terminationDate?: string;
    
    // Personal details
    birthplace?: string;
    allergies?: string;
    dietaryRestrictions?: string;
    secondaryLanguage?: string;
    
    // Contact information
    workExtension?: string;
    workPhoneExt?: string;
    mobilePhone?: string;
    homeEmail?: string;
    
    // Social media
    linkedinUrl?: string;
    facebookUrl?: string;
    twitterFeed?: string;
    instagramUrl?: string;
    pinterestUrl?: string;
    skypeUsername?: string;
    aimUsername?: string;
    windowsLiveMessenger?: string;
    
    // Additional identifiers
    ssn?: string;
    sin?: string;
    nin?: string;
    nationalId?: string;
    taxId?: string;
    
    // Calculated fields
    age?: string;
    birthday?: string;
    firstNameLastName?: string;
    firstNameMiddleInitial?: string;
    lastFirstMiddlePreferredName?: string;
    middleInitial?: string;
    name?: string;
    
    // Job level and pay information
    jobLevel?: string;
    payGroup?: string;
    
    // Time tracking
    timeTrackingEnabled?: string;
    timeTrackingGroup?: string;
    timesheetType?: string;
    timesheetWorkWeekStartsOn?: string;
    overtimeExempt?: string;
    customOvertimeEnabled?: string;
    customDailyOvertimeThreshold?: string;
    customDailyDoubleOvertimeThreshold?: string;
    customWeeklyOvertimeThreshold?: string;
    timeTrackingMobileAppEnabled?: string;
    timeTrackingMobileAppGeolocationEnabled?: string;
    timeTrackingClockInId?: string;
    
    // Employee settings
    timezone?: string;
    selfServiceAccess?: string;
    
    // Physical attributes
    shirtSize?: string;
    tshirtSize?: string;
    jacketSize?: string;
    
    // ACA and benefits
    acaStatus?: string;
    
    // Last changed tracking
    lastChanged?: string;
    lastChangedIso?: string;
    
    // ZIP code
    zipcode?: string;
}

export interface BamboohrEmployeeResponse {
    employees: BambooHrEmployee[];
}

// New dataset-related types
export interface DatasetField {
    id: string;
    name: string;
    type: string;
    alias?: string;
}

export interface DatasetFieldOptionsResponse {
    options: Option[];
}

export interface DatasetDataResponse {
    data: BambooHrEmployee[];
}

export interface Dataset {
    name: string;
    displayName: string;
    description?: string;
}

export interface DatasetsResponse {
    datasets: Dataset[];
}
