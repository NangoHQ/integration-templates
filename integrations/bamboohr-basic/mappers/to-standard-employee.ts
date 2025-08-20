import type { StandardEmployee, Phone } from '../models.js';
import type { BambooHrEmployee } from '../types.js';

function mapEmploymentType(status: string | undefined): StandardEmployee['employmentType'] {
    if (!status) return 'OTHER';

    switch (status.toUpperCase()) {
        case 'FULL-TIME':
            return 'FULL_TIME';
        case 'PART-TIME':
            return 'PART_TIME';
        case 'INTERN':
            return 'INTERN';
        case 'CONTRACTOR':
            return 'CONTRACTOR';
        default:
            return 'OTHER';
    }
}

function mapEmploymentStatus(status: string | undefined): StandardEmployee['employmentStatus'] {
    if (!status) return 'PENDING';

    switch (status.toUpperCase()) {
        case 'TERMINATED':
            return 'TERMINATED';
        case 'FULL-TIME':
        case 'PART-TIME':
        case 'INTERN':
            return 'ACTIVE';
        default:
            return 'PENDING';
    }
}

export function toStandardEmployee(employee: BambooHrEmployee): StandardEmployee {
    const supervisorParts = (employee['supervisorName'] || '').split(',');
    const supervisorFirstName = supervisorParts[1]?.trim() || '';
    const supervisorLastName = supervisorParts[0]?.trim() || '';

    const manager = employee['supervisorId']
        ? {
              id: employee['supervisorId'],
              firstName: supervisorFirstName,
              lastName: supervisorLastName,
              email: employee['supervisorEmail'] || '' // Use supervisorEmail if available
          }
        : {
              id: '',
              firstName: '',
              lastName: '',
              email: ''
          };

    const baseEmployee: StandardEmployee = {
        // Core fields
        id: employee['employeeNumber'] || '', // Use employeeNumber as ID since there's no direct 'id' field
        firstName: employee['firstName'] || '',
        lastName: employee['lastName'] || '',
        email: employee['email'] || '', // Use 'email' field (Work Email)
        displayName: `${employee['firstName'] || ''} ${employee['lastName'] || ''}`.trim(),
        employeeNumber: employee['employeeNumber'] || '',

        // Employment details
        title: employee['jobInformationJobTitle'] || '',
        department: {
            id: employee['jobInformationDepartment'] || 'unknown',
            name: employee['jobInformationDepartment'] || 'Unknown Department'
        },
        employmentType: mapEmploymentType(employee['employmentStatus']),
        employmentStatus: mapEmploymentStatus(employee['employmentStatus']),
        startDate: employee['hireDate'] || new Date().toISOString(),
        terminationDate: employee['terminationDate'] || '',
        manager,
        workLocation: {
            name: employee['jobInformationLocation'] || '',
            type: 'OFFICE',
            primaryAddress: {
                street: employee['addressLineOne'] || '',
                city: employee['city'] || '',
                state: employee['state'] || '',
                country: employee['country'] || '',
                postalCode: employee['zipcode'] || '',
                type: 'WORK'
            }
        },

        // Personal details
        addresses: [
            {
                street: employee['addressLineOne'] || '',
                city: employee['city'] || '',
                state: employee['state'] || '',
                country: employee['country'] || '',
                postalCode: employee['zipcode'] || '',
                type: 'HOME'
            }
        ],
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        phones: [
            ...(employee['workPhone'] ? [{ type: 'WORK', number: employee['workPhone'] }] : []),
            ...(employee['homePhone'] ? [{ type: 'HOME', number: employee['homePhone'] }] : []),
            ...(employee['mobilePhone'] ? [{ type: 'MOBILE', number: employee['mobilePhone'] }] : [])
        ] as Phone[],
        emails: [
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            { type: 'WORK' as const, address: employee['email'] || '' },
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            ...(employee['homeEmail'] ? [{ type: 'PERSONAL' as const, address: employee['homeEmail'] }] : [])
        ],

        // Provider-specific data
        providerSpecific: {
            division: employee['jobInformationDivision'],
            payBand: employee['payBand'],
            payType: employee['compensationPayType'],
            paySchedule: employee['compensationPaySchedule'],
            createdByUserId: employee['createdByUserId'],
            dateOfBirth: employee['dateOfBirth'],
            gender: employee['gender'],
            maritalStatus: employee['maritalStatus'],
            // Additional useful fields
            middleName: employee['middleName'],
            preferredName: employee['preferredName'],
            employeePronouns: employee['employeePronouns'],
            citizenship: employee['citizenship'],
            nationality: employee['nationality'],
            ethnicity: employee['ethnicity'],
            veteranStatus: employee['veteranStatus'],
            flsaCode: employee['flsaCode'],
            eeoJobCategory: employee['eeoJobCategory'],
            standardHoursPerWeek: employee['standardHoursPerWeek'],
            team: employee['team'],
            originalHireDate: employee['originalHireDate'],
            fullTimeDate: employee['fullTimeDate'],
            probationEndDate: employee['probationEndDate'],
            contractEndDate: employee['contractEndDate'],
            noticePeriod: employee['noticePeriod'],
            eligibleForRehire: employee['eligibleForRehire'],
            lengthOfService: employee['lengthOfService'],
            lengthOfServiceYears: employee['lengthOfServiceYears'],
            isSupervisor: employee['isSupervisor'],
            supervisorEmail: employee['supervisorEmail'],
            supervisorEid: employee['supervisorEid'],
            // Compensation fields
            compensationPayRate: employee['compensationPayRate'],
            compensationPayRateCurrencyCode: employee['compensationPayRateCurrencyCode'],
            compensationOvertimeRate: employee['compensationOvertimeRate'],
            compensationOvertimeRateCurrencyCode: employee['compensationOvertimeRateCurrencyCode'],
            compensationOvertimeStatus: employee['compensationOvertimeStatus'],
            compensationPaidPer: employee['compensationPaidPer'],
            compensationEffectiveDate: employee['compensationEffectiveDate'],
            compensationChangeReason: employee['compensationChangeReason'],
            compensationComments: employee['compensationComments'],
            // Employment status details
            employmentStatusFTE: employee['employmentStatusFTE'],
            employmentStatusComment: employee['employmentStatusComment'],
            employmentStatusEffectiveDate: employee['employmentStatusEffectiveDate'],
            employmentStatusEmployeeTaxType: employee['employmentStatusEmployeeTaxType'],
            employmentStatusFinalPayDate: employee['employmentStatusFinalPayDate'],
            employmentStatusRegrettableOrNonRegrettable: employee['employmentStatusRegrettableOrNonRegrettable'],
            employmentStatusTerminationReason: employee['employmentStatusTerminationReason'],
            employmentStatusTerminationType: employee['employmentStatusTerminationType'],
            preTerminationEmploymentStatus: employee['preTerminationEmploymentStatus'],
            // Personal details
            birthplace: employee['birthplace'],
            allergies: employee['allergies'],
            dietaryRestrictions: employee['dietaryRestrictions'],
            secondaryLanguage: employee['secondaryLanguage'],
            // Contact information
            workExtension: employee['workExtension'],
            workPhoneExt: employee['workPhoneExt'],
            // Social media
            linkedinUrl: employee['linkedinUrl'],
            facebookUrl: employee['facebookUrl'],
            twitterFeed: employee['twitterFeed'],
            instagramUrl: employee['instagramUrl'],
            pinterestUrl: employee['pinterestUrl'],
            skypeUsername: employee['skypeUsername'],
            aimUsername: employee['aimUsername'],
            windowsLiveMessenger: employee['windowsLiveMessenger'],
            // Additional identifiers
            ssn: employee['ssn'],
            sin: employee['sin'],
            nin: employee['nin'],
            nationalId: employee['nationalId'],
            taxId: employee['taxId'],
            // Calculated fields
            age: employee['age'],
            birthday: employee['birthday'],
            firstNameLastName: employee['firstNameLastName'],
            firstNameMiddleInitial: employee['firstNameMiddleInitial'],
            lastFirstMiddlePreferredName: employee['lastFirstMiddlePreferredName'],
            middleInitial: employee['middleInitial'],
            name: employee['name'],
            // Job level and pay information
            jobLevel: employee['jobLevel'],
            payGroup: employee['payGroup'],
            // Time tracking
            timeTrackingEnabled: employee['timeTrackingEnabled'],
            timeTrackingGroup: employee['timeTrackingGroup'],
            timesheetType: employee['timesheetType'],
            timesheetWorkWeekStartsOn: employee['timesheetWorkWeekStartsOn'],
            overtimeExempt: employee['overtimeExempt'],
            customOvertimeEnabled: employee['customOvertimeEnabled'],
            customDailyOvertimeThreshold: employee['customDailyOvertimeThreshold'],
            customDailyDoubleOvertimeThreshold: employee['customDailyDoubleOvertimeThreshold'],
            customWeeklyOvertimeThreshold: employee['customWeeklyOvertimeThreshold'],
            timeTrackingMobileAppEnabled: employee['timeTrackingMobileAppEnabled'],
            timeTrackingMobileAppGeolocationEnabled: employee['timeTrackingMobileAppGeolocationEnabled'],
            timeTrackingClockInId: employee['timeTrackingClockInId'],
            // Employee settings
            timezone: employee['timezone'],
            selfServiceAccess: employee['selfServiceAccess'],
            // Physical attributes
            shirtSize: employee['shirtSize'],
            tshirtSize: employee['tshirtSize'],
            jacketSize: employee['jacketSize'],
            // ACA and benefits
            acaStatus: employee['acaStatus'],
            // Last changed tracking
            lastChanged: employee['lastChanged'],
            lastChangedIso: employee['lastChangedIso']
        },

        // Audit fields
        createdAt: '',
        updatedAt: employee['lastChangedIso'] || employee['lastChanged'] || ''
    };

    return baseEmployee;
}
