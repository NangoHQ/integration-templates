import type { SapSuccessFactorsComprehensiveEmployee, EmailNav, JobInfoNav, PersonalInfoNav, EmploymentNav, CompanyNav } from '../types.js';
import { parseSapDateToISOString, getMostRecentInfo } from '../helpers/utils.js';
import type { StandardEmployee, Email, Phone, Address } from '../../models.js';

const EMAIL_TYPES = {
    WORK: '8448',
    PERSONAL: '8449'
};

const PHONE_TYPES = {
    WORK: '10605',
    HOME: '10604',
    MOBILE: '10606'
};

const EMPLOYMENT_STATUSES = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
};

function getPrimaryEmail(emails: EmailNav[]): string {
    if (!emails?.length) return '';

    const primaryEmail = emails.find((email) => email.isPrimary);
    return primaryEmail?.emailAddress || emails[0]?.emailAddress || '';
}

function mapEmailType(emailType: string): 'WORK' | 'PERSONAL' {
    return emailType === EMAIL_TYPES.WORK ? 'WORK' : 'PERSONAL';
}

function mapPhoneType(phoneType: string): 'WORK' | 'HOME' | 'MOBILE' {
    switch (phoneType) {
        case PHONE_TYPES.WORK:
            return 'WORK';
        case PHONE_TYPES.HOME:
            return 'HOME';
        default:
            return 'MOBILE';
    }
}

function mapEmploymentType(regularTempNav?: { status?: string }): 'FULL_TIME' | 'PART_TIME' {
    return regularTempNav?.status === EMPLOYMENT_STATUSES.ACTIVE ? 'FULL_TIME' : 'PART_TIME';
}

function buildStreetAddress(address1?: string | null, address2?: string | null): string {
    if (!address1) return '';
    return address2 ? `${address1}, ${address2}` : address1;
}

function extractManagerInfo(jobInfo?: JobInfoNav): StandardEmployee['manager'] {
    const managerNav = jobInfo?.managerEmploymentNav;
    if (!managerNav) {
        return {
            id: '',
            firstName: '',
            lastName: '',
            email: ''
        };
    }

    const personalInfo = managerNav.personNav?.personalInfoNav?.results?.[0];
    const email = managerNav.personNav?.emailNav?.results?.[0]?.emailAddress;

    return {
        id: managerNav.userId || '',
        firstName: personalInfo?.firstName || '',
        lastName: personalInfo?.lastName || '',
        email: email || ''
    };
}

function extractWorkLocation(jobInfo?: JobInfoNav): StandardEmployee['workLocation'] {
    const locationNav = jobInfo?.locationNav;
    if (!locationNav) {
        return {
            name: '',
            type: 'OFFICE',
            primaryAddress: {
                street: '',
                city: '',
                state: '',
                country: '',
                postalCode: '',
                type: 'WORK'
            }
        };
    }

    const addressNav = locationNav.addressNavDEFLT;

    return {
        name: locationNav.name || '',
        type: 'OFFICE',
        primaryAddress: {
            street: buildStreetAddress(addressNav?.address1, addressNav?.address2),
            city: addressNav?.city || '',
            state: addressNav?.state || '',
            country: addressNav?.country || '',
            postalCode: addressNav?.zipCode || '',
            type: 'HOME'
        }
    };
}

function mapEmployeeStatus(statusText: string | null | undefined): StandardEmployee['employmentStatus'] {
    if (!statusText) return 'TERMINATED';
    const normalized = statusText.trim().toLowerCase();

    switch (normalized) {
        case 'active':
        case 'dormant':
            return 'ACTIVE';

        case 'unpaid leave':
        case 'paid leave':
        case 'furlough':
            return 'ON_LEAVE';

        case 'suspended':
            return 'SUSPENDED';

        case 'terminated':
        case 'retired':
        case 'discarded/obsolete':
        case 'reported no-show':
        case 'inactive':
            return 'TERMINATED';

        default:
            return 'PENDING';
    }
}

function extractProviderSpecificData(person: SapSuccessFactorsComprehensiveEmployee) {
    const mostRecentPersonal = getMostRecentInfo(person.personalInfoNav?.results);
    const mostRecentEmployment = getMostRecentInfo(person.employmentNav?.results);
    const mostRecentJobInfo = getMostRecentInfo(mostRecentEmployment?.compInfoNav?.results);
    const mostRecentJobInfoEmployment = mostRecentJobInfo?.employmentNav;
    const mostRecentJobInfoEmploymentJobInfo = getMostRecentInfo(mostRecentJobInfoEmployment?.jobInfoNav?.results);

    return {
        personIdExternal: person.personIdExternal,
        personId: person.personId,
        dateOfBirth: parseSapDateToISOString(person.dateOfBirth),
        countryOfBirth: person.countryOfBirth,
        preferredName: mostRecentPersonal?.preferredName,
        middleName: mostRecentPersonal?.middleName,
        gender: mostRecentPersonal?.gender,
        nationality: mostRecentPersonal?.nationality,
        userId: mostRecentEmployment?.userId,
        employmentId: mostRecentEmployment?.employmentId,
        isContingentWorker: mostRecentEmployment?.isContingentWorker,
        assignmentIdExternal: mostRecentEmployment?.assignmentIdExternal,
        jobCode: mostRecentJobInfoEmploymentJobInfo?.jobCode,
        position: mostRecentJobInfoEmploymentJobInfo?.position,
        businessUnit: mostRecentJobInfoEmploymentJobInfo?.businessUnit,
        costCenter: mostRecentJobInfoEmploymentJobInfo?.costCenter,
        primaryPhone: person.phoneNav?.results?.find((p) => p.isPrimary)?.phoneNumber,
        primaryEmailType: person.emailNav?.results?.find((e) => e.isPrimary)?.emailType,
        homeAddressType: person.homeAddressNavDEFLT?.results?.[0]?.addressType,
        homeAddressCountry: person.homeAddressNavDEFLT?.results?.[0]?.country,
        salutation: mostRecentPersonal?.salutation,
        maritalStatus: mostRecentPersonal?.maritalStatus,
        suffix: mostRecentPersonal?.suffix,
        serviceDate: parseSapDateToISOString(mostRecentEmployment?.serviceDate),
        seniorityDate: parseSapDateToISOString(mostRecentEmployment?.seniorityDate),
        firstDateWorked: parseSapDateToISOString(mostRecentEmployment?.firstDateWorked),
        jobTitle: mostRecentJobInfoEmploymentJobInfo?.jobTitle,
        division: mostRecentJobInfoEmploymentJobInfo?.division,
        location: mostRecentJobInfoEmploymentJobInfo?.location,
        primaryPhoneAreaCode: person.phoneNav?.results?.find((p) => p.isPrimary)?.areaCode,
        primaryPhoneCountryCode: person.phoneNav?.results?.find((p) => p.isPrimary)?.countryCode,
        homeAddressCity: person.homeAddressNavDEFLT?.results?.[0]?.city,
        latestTerminationDate: parseSapDateToISOString(person.personEmpTerminationInfoNav?.latestTerminationDate),
        activeEmploymentsCount: person.personEmpTerminationInfoNav?.activeEmploymentsCount,
        okToRehire: mostRecentEmployment?.okToRehire
    };
}

export function toStandardEmployee(person: SapSuccessFactorsComprehensiveEmployee): StandardEmployee {
    const personalInfos = person.personalInfoNav?.results ?? [];
    const employmentInfos = person.employmentNav?.results ?? [];

    const mostRecentPersonal: PersonalInfoNav = getMostRecentInfo(personalInfos);
    const mostRecentEmployment: EmploymentNav = getMostRecentInfo(employmentInfos);
    const mostRecentJobInfo: CompanyNav = getMostRecentInfo(mostRecentEmployment?.compInfoNav?.results);
    const mostRecentJobInfoEmployment = mostRecentJobInfo?.employmentNav;
    const mostRecentJobInfoEmploymentJobInfo: JobInfoNav = getMostRecentInfo(mostRecentJobInfoEmployment?.jobInfoNav?.results);

    const emails: Email[] =
        person.emailNav?.results?.map((email) => ({
            address: email.emailAddress,
            type: mapEmailType(email.emailType)
        })) ?? [];

    const phones: Phone[] =
        person.phoneNav?.results?.map((phone) => ({
            number: phone.phoneNumber,
            type: mapPhoneType(phone.phoneType)
        })) ?? [];

    const addresses: Address[] =
        person.homeAddressNavDEFLT?.results?.map((address) => ({
            street: address.address1 || '',
            city: address.city || '',
            state: address.state || '',
            country: address.country || '',
            postalCode: address.zipCode || '',
            type: 'HOME'
        })) ?? [];

    return {
        id: person.perPersonUuid,
        firstName: mostRecentPersonal?.firstName || '',
        lastName: mostRecentPersonal?.lastName || '',
        email: getPrimaryEmail(person.emailNav?.results),
        displayName: `${mostRecentPersonal?.firstName || ''} ${mostRecentPersonal?.lastName || ''}`.trim(),
        employeeNumber: mostRecentEmployment?.employmentId || '',
        title: mostRecentJobInfoEmploymentJobInfo?.jobTitle || '',
        department: {
            id: mostRecentJobInfoEmploymentJobInfo?.department || '',
            name: mostRecentJobInfoEmploymentJobInfo?.division || ''
        },
        employmentType: mapEmploymentType(mostRecentJobInfoEmploymentJobInfo?.regularTempNav),
        employmentStatus: mapEmployeeStatus(mostRecentJobInfoEmploymentJobInfo?.employmentTypeNav?.status),
        startDate: parseSapDateToISOString(mostRecentEmployment?.startDate),
        ...(person.personEmpTerminationInfoNav?.latestTerminationDate && {
            terminationDate: parseSapDateToISOString(person.personEmpTerminationInfoNav.latestTerminationDate || undefined)
        }),
        workLocation: extractWorkLocation(mostRecentJobInfoEmploymentJobInfo),
        manager: extractManagerInfo(mostRecentJobInfoEmploymentJobInfo),
        addresses,
        phones,
        emails,
        providerSpecific: extractProviderSpecificData(person),
        createdAt: parseSapDateToISOString(person.createdDateTime),
        updatedAt: parseSapDateToISOString(person.lastModifiedDateTime)
    };
}
