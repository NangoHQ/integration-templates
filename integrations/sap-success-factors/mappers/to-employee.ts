import type { SapSuccessFactorsPerPerson } from '../types.js';
import type { Employee } from '../../models';
import { parseSapDateToISOString } from '../helpers/utils.js';

export function toEmployee(person: SapSuccessFactorsPerPerson): Employee {
    const personalInfos = person.personalInfoNav?.results ?? [];

    const mostRecent =
        personalInfos.length === 1
            ? personalInfos[0]
            : personalInfos
                  .map((info) => ({
                      ...info,
                      parsedStartDate: parseSapDateToISOString(info.startDate)
                  }))
                  .filter((info) => info.parsedStartDate !== null)
                  .sort((a, b) => new Date(b.parsedStartDate).getTime() - new Date(a.parsedStartDate).getTime())[0];

    return {
        id: person.perPersonUuid,
        personIdExternal: person.personIdExternal,
        dateOfBirth: parseSapDateToISOString(person.dateOfBirth),
        countryOfBirth: person.countryOfBirth,
        createdDateTime: parseSapDateToISOString(person.createdDateTime),
        lastModifiedDateTime: parseSapDateToISOString(person.lastModifiedDateTime),
        firstName: mostRecent?.firstName || '',
        lastName: mostRecent?.lastName || '',
        preferredName: mostRecent?.preferredName || mostRecent?.firstName || '',
        gender: mostRecent?.gender || '',
        nationality: mostRecent?.nationality || '',
        maritalStatus: mostRecent?.maritalStatus || ''
    };
}
