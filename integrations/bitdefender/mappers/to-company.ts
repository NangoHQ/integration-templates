import type { BitdefenderCompanyResponse } from '../types';
import type { BitdefenderCompany } from '../../models';

export function toCompany(result: BitdefenderCompanyResponse['result']): BitdefenderCompany {
    if (!result) {
        throw new Error('Invalid company data: result is undefined');
    }

    return {
        id: result.id,
        name: result.name,
        type: Number(result.type),
        country: result.country,
        createdAt: result.createdAt,
        subscribedServices: {
            endpoint: result.subscribedServices ? result.subscribedServices.endpoint : false,
            exchange: result.subscribedServices ? result.subscribedServices.exchange : false,
            network: result.subscribedServices ? result.subscribedServices.network : false,
            sos: result.subscribedServices ? result.subscribedServices.sos : false
        },
        raw_json: JSON.stringify(result)
    };
}
