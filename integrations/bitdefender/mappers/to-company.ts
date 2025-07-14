import type { BitdefenderCompany } from '../../models.js';
import type { BitdefenderCompanyResponse } from '../types.js';

export function toCompany(result: BitdefenderCompanyResponse['result']): BitdefenderCompany {
    return {
        id: result.id,
        name: result.name,
        type: result.type,
        country: result.country,
        subscribedServices: {
            endpoint: result.subscribedServices?.endpoint || false,
            exchange: result.subscribedServices?.exchange || false,
            network: result.subscribedServices?.network || false,
            sos: result.subscribedServices?.sos || false
        }
    };
}
