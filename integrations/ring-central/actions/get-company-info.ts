import type { NangoAction, ProxyConfiguration, CompanyInfo } from '../../models.js';
import type { RingCentralCompanyResponse } from '../types.js';

export default async function runAction(nango: NangoAction): Promise<CompanyInfo> {
    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/Company/readAccountInfo
        endpoint: '/restapi/v1.0/account/~',
        retries: 3
    };

    const response = await nango.get<RingCentralCompanyResponse>(config);

    return {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        serviceInfo: {
            brand: {
                id: response.data.serviceInfo.brand.id,
                name: response.data.serviceInfo.brand.name
            },
            servicePlan: {
                id: response.data.serviceInfo.servicePlan.id,
                name: response.data.serviceInfo.servicePlan.name
            }
        },
        mainNumber: response.data.mainNumber,
        operator: {
            id: response.data.operator?.id,
            extensionNumber: response.data.operator?.extensionNumber
        }
    };
}
