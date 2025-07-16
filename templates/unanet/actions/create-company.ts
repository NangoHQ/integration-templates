import { createAction } from "nango";

import { getOrCreateCompany } from '../helpers/get-or-create-company.js';

import { Company, CreateCompany } from "../models.js";

const action = createAction({
    description: "Create a company in the system",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/company"
    },

    input: CreateCompany,
    output: Company,

    exec: async (nango, input): Promise<Company> => {
        if (!input?.name) {
            throw new nango.ActionError({
                message: 'Name is required to create a company',
                code: 'missing_name'
            });
        }

        const federalAgency = input.federalAgency ?? { name: input.name };

        const company = await getOrCreateCompany(nango, federalAgency);

        return company;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
