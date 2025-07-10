import type { SapSuccessFactorsLocation } from '../types.js';
import type { Location } from '../../models';
import { parseSapDateToISOString } from '../helpers/utils.js';

export function toLocation(location: SapSuccessFactorsLocation): Location {
    const address = location.addressNavDEFLT;

    return {
        id: location.objectId,
        externalCode: location.externalCode,
        name: location.name,
        description: location.description,
        status: location.status,
        startDate: parseSapDateToISOString(location.startDate),
        endDate: parseSapDateToISOString(location.endDate),
        timezone: location.timezone,
        createdDateTime: parseSapDateToISOString(location.createdDateTime),
        lastModifiedDateTime: parseSapDateToISOString(location.lastModifiedDateTime),
        country: address.country,
        state: address.state,
        city: address.city,
        zipCode: address.zipCode,
        addressLine1: address.address1,
        addressLine2: address.address2
    };
}
