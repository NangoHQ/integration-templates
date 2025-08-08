import { createAction } from 'nango';
import type { RingCentralCompanyResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { CompanyInfo } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Retrieves information about the current RingCentral account/company.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/account/current',
        group: 'Company'
    },

    input: z.void(),
    output: CompanyInfo,

    exec: async (nango): Promise<CompanyInfo> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
