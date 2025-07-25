import { createAction } from "nango";
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

import type { ProxyConfiguration } from "nango";
import { CreateUpdateCompanyOutput, CreateCompanyInput } from "../models.js";

const action = createAction({
    description: "Create a single company in Hubspot",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/companies",
        group: "Companies"
    },

    input: CreateCompanyInput,
    output: CreateUpdateCompanyOutput,
    scopes: ["crm.objects.companies.write", "oauth"],

    exec: async (nango, input): Promise<CreateUpdateCompanyOutput> => {
        const hubSpotCompany = toHubspotCompany(input);
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/companies#create-companies
            endpoint: 'crm/v3/objects/companies',
            data: hubSpotCompany,
            retries: 3
        };

        const response = await nango.post(config);

        return createUpdateCompany(response.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
