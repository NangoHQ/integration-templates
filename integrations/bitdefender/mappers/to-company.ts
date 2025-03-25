import type { BitdefenderCompany } from '../../models';

export function toCompany(result: any): BitdefenderCompany {
    return {
        id: result.id,
        name: result.name,
        type: result.type,
        country: result.country,
        createdAt: new Date().toISOString(), // API doesn't return creation date, using current date
        subscribedServices: {
            endpoint: result.subscribedServices?.endpoint || false,
            exchange: result.subscribedServices?.exchange || false,
            network: result.subscribedServices?.network || false,
            sos: result.subscribedServices?.sos || false
        },
        raw_json: JSON.stringify(result)
    };
}
