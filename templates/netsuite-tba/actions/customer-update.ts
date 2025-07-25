import { createAction } from "nango";
import type { NS_Customer, NS_Address } from '../types.js';
import { netsuiteCustomerUpdateInputSchema } from '../schema.js';

import { NetsuiteCustomerUpdateOutput, NetsuiteCustomerUpdateInput } from "../models.js";

const action = createAction({
    description: "Updates a customer in Netsuite",
    version: "2.0.0",

    endpoint: {
        method: "PUT",
        path: "/customers",
        group: "Customers"
    },

    input: NetsuiteCustomerUpdateInput,
    output: NetsuiteCustomerUpdateOutput,

    exec: async (nango, input): Promise<NetsuiteCustomerUpdateOutput> => {
        await nango.zodValidateInput({ zodSchema: netsuiteCustomerUpdateInputSchema, input });

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
            id: input.id
        };
        if (input.externalId) {
            body.externalId = input.externalId;
        }
        if (input.name) {
            body.companyName = input.name;
        }
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

        await nango.patch({
            endpoint: `/customer/${input.id}?replace=addressBook`,
            data: body,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
