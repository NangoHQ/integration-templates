import { createAction } from "nango";
import type { BitdefenderCompanyResponse } from '../types.js';
import { toCompany } from '../mappers/to-company.js';

import type { ProxyConfiguration } from "nango";
import { BitdefenderCompany } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Retrieves detailed information about the current company in Bitdefender GravityZone.",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/company-details",
        group: "Company"
    },

    input: z.void(),
    output: BitdefenderCompany,

    exec: async (nango): Promise<BitdefenderCompany> => {
        const config: ProxyConfiguration = {
            // https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
            endpoint: 'v1.0/jsonrpc/companies',
            data: {
                jsonrpc: '2.0',
                method: 'getCompanyDetails',
                params: {},
                id: Date.now().toString()
            },
            retries: 3
        };

        const response = await nango.post<BitdefenderCompanyResponse>(config);
        await nango.log(`Retrieved company details. Status: ${response.status}`);

        // Check for errors in the response
        if (response.data && response.data.error) {
            throw new nango.ActionError({
                message: `Error retrieving company details: ${response.data.error.message}`,
                details: JSON.stringify(response.data.error)
            });
        }

        if (!response.data.result) {
            throw new nango.ActionError({
                message: 'No result found in response',
                details: 'The API response did not contain the expected company details'
            });
        }

        return toCompany(response.data.result);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
