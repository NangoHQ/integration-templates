import { createAction } from 'nango';
import type { NS_Customer, NS_Address } from '../types.js';
import { netsuiteCustomerCreateInputSchema } from '../schema.js';

import { NetsuiteCustomerCreateOutput, NetsuiteCustomerCreateInput } from '../models.js';

const action = createAction({
    description: 'Creates a customer in Netsuite',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/customers',
        group: 'Customers'
    },

    input: NetsuiteCustomerCreateInput,
    output: NetsuiteCustomerCreateOutput,

    exec: async (nango, input): Promise<NetsuiteCustomerCreateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuiteCustomerCreateInputSchema, input });

        const address: Partial<NS_Address> = {};
        if (input.addressLine1) {
            address.addr1 = input.addressLine1;
        }
        if (input.addressLine2) {
            address.addr2 = input.addressLine2;
        }
        if (input.city) {
            address.city = input.city;
        }
        if (input.zip) {
            address.zip = input.zip;
        }
        if (input.country) {
            address.country = { id: input.country };
        }
        if (input.state) {
            address.state = { id: input.state };
        }

        const body: Partial<NS_Customer> = {
            externalId: input.externalId,
            companyName: input.name
        };
        if (input.email) {
            body.email = input.email;
        }
        if (input.phone) {
            body.phone = input.phone;
        }
        if (input.taxNumber) {
            body.defaultTaxReg = input.taxNumber;
        }
        if (Object.keys(address).length > 0) {
            body.addressBook = { items: [{ addressBookAddress: address }] };
        }
        const res = await nango.post({
            endpoint: '/customer',
            data: body,
            retries: 3
        });
        const id = res.headers['location']?.split('/').pop();
        if (!id) {
            throw new nango.ActionError({
                message: "Error creating customer: could not parse 'id' from Netsuite API response"
            });
        }
        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
