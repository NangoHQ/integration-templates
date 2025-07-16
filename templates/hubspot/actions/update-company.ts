import { createAction } from "nango";
import { UpdateCompanyInputSchema } from '../schema.js';
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

import type { ProxyConfiguration } from "nango";
import { CreateUpdateCompanyOutput, UpdateCompanyInput } from "../models.js";

const action = createAction({
    description: "Update a single company in Hubspot",
    version: "0.0.1",

    endpoint: {
        method: "PATCH",
        path: "/companies",
        group: "Companies"
    },

    input: UpdateCompanyInput,
    output: CreateUpdateCompanyOutput,
    scopes: ["crm.objects.companies.write", "oauth"],

    exec: async (nango, input): Promise<CreateUpdateCompanyOutput> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateCompanyInputSchema, input });

        const hubSpotCompany = toHubspotCompany(parsedInput.data);
        const config: ProxyConfiguration = {
            //https://developers.hubspot.com/docs/api/crm/companies#update-companies
            endpoint: `crm/v3/objects/companies/${parsedInput.data.id}`,
            data: hubSpotCompany,
            retries: 3
        };

        const response = await nango.patch(config);

        return createUpdateCompany(response.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
