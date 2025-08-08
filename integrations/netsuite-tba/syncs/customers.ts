import { createSync } from 'nango';
import type { NS_Customer, NSAPI_GetResponse } from '../types.js';
import { paginate } from '../helpers/pagination.js';
import { formatDate } from '../helpers/utils.js';

import type { ProxyConfiguration } from 'nango';
import { NetsuiteCustomer, NetsuiteMetadata } from '../models.js';

const retries = 3;

const sync = createSync({
    description: 'Fetches all customers in Netsuite',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/customers',
            group: 'Customers'
        }
    ],

    models: {
        NetsuiteCustomer: NetsuiteCustomer
    },

    metadata: NetsuiteMetadata,

    exec: async (nango) => {
        const lastModifiedDateQuery = nango.lastSyncDate ? `lastModifiedDate ON_OR_AFTER "${await formatDate(nango.lastSyncDate, nango)}"` : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-customer
            endpoint: '/customer',
            retries,
            ...(lastModifiedDateQuery ? { params: { q: lastModifiedDateQuery } } : {})
        };
        for await (const customers of paginate<{ id: string }>({ nango, proxyConfig })) {
            await nango.log('Listed Customers', { total: customers.length });

            const mappedCustomers: NetsuiteCustomer[] = [];
            for (const customerLink of customers) {
                const customer: NSAPI_GetResponse<NS_Customer> = await nango.get({
                    endpoint: `/customer/${customerLink.id}`,
                    params: {
                        expandSubResources: 'true'
                    },
                    retries
                });
                if (!customer.data) {
                    await nango.log('Customer not found', { id: customerLink.id });
                    continue;
                }
                const address = customer.data.addressBook?.items[0]?.addressBookAddress;
                mappedCustomers.push({
                    id: customer.data.id,
                    externalId: customer.data.externalId || null,
                    name: customer.data.companyName,
                    email: customer.data.email || null,
                    taxNumber: customer.data.defaultTaxReg || null,
                    phone: customer.data.phone || null,
                    addressLine1: address?.addr1 || null,
                    addressLine2: address?.addr2 || null,
                    city: address?.city || null,
                    zip: address?.zip || null,
                    country: address?.country?.id || null,
                    state: address?.state?.id || null
                });
            }

            await nango.batchSave(mappedCustomers, 'NetsuiteCustomer');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
