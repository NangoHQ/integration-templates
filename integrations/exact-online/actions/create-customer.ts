import { createAction } from "nango";
import type { EO_Account, ResponsePostBody } from '../types.js';
import { getUser } from '../helpers/get-user.js';
import { exactCustomerCreateInputSchema } from '../schema.zod.js';

import { ExactCustomerCreateOutput, ExactCustomerCreateInput } from "../models.js";

const action = createAction({
    description: "Creates a customer in ExactOnline",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/customers",
        group: "Customers"
    },

    input: ExactCustomerCreateInput,
    output: ExactCustomerCreateOutput,

    exec: async (nango, input): Promise<ExactCustomerCreateOutput> => {
        await nango.zodValidateInput({ zodSchema: exactCustomerCreateInputSchema, input });

        const { division } = await getUser(nango);

        const body: Partial<EO_Account> = {
            Name: input.name,
            Email: input.email || null,
            AddressLine1: input.addressLine1 || null,
            AddressLine2: input.addressLine2 || null,
            City: input.city || null,
            CountryName: input.country || null,
            Postcode: input.zip || null,
            StateName: input.state || null,
            Phone: input.phone || null,
            VATNumber: input.taxNumber || null,
            Status: 'C' //  A=None, S=Suspect, P=Prospect, C=Customer
        };

        const create = await nango.post<ResponsePostBody<EO_Account>>({
            endpoint: `/api/v1/${division}/crm/Accounts`,
            data: body,
            retries: 3
        });

        return {
            id: create.data.d.ID
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
