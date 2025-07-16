import { createSync } from "nango";
import type { EO_Account } from '../types.js';
import { getUser } from '../helpers/get-user.js';

import { ExactCustomer } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches all customers in Exact Online",
    version: "1.0.1",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/customers",
        group: "Customers"
    }],

    models: {
        ExactCustomer: ExactCustomer
    },

    metadata: z.object({}),

    exec: async nango => {
        const { division } = await getUser(nango);

        // List the accounts inside the user's Division
        for await (const accounts of nango.paginate<EO_Account>({
            endpoint: `/api/v1/${division}/crm/Accounts`,
            headers: { accept: 'application/json' },
            paginate: { response_path: 'd.results' },
            retries: 10
        })) {
            await nango.log('Listed', { total: accounts.length });

            const customers = accounts.map<ExactCustomer>((account) => {
                const tmp: ExactCustomer = {
                    id: account.ID,
                    division: account.Division,
                    name: account.Name,
                    city: account.City,
                    country: account.CountryName,
                    email: account.Email,
                    phone: account.Phone,
                    state: account.StateName,
                    addressLine1: account.AddressLine1,
                    addressLine2: account.AddressLine2,
                    taxNumber: account.VATNumber,
                    zip: account.Postcode
                };
                return tmp;
            });
            await nango.batchSave(customers, 'ExactCustomer');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
