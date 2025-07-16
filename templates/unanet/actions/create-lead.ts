import { createAction } from "nango";
import type { UnanetLead } from '../types.js';
import { toLead } from '../mappers/to-lead.js';
import { optionalsToPotentialClient } from '../mappers/federal-agency.js';

import { Lead, CreateLead } from "../models.js";

const action = createAction({
    description: "Create a lead with with information about the federal agency, the name, due date, posted date, solicitation number, naics category or categories, the city, state, country, and description.",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/leads",
        group: "Leads"
    },

    input: CreateLead,
    output: Lead,

    exec: async (nango, input): Promise<Lead> => {
        validate(nango, input);

        const data: UnanetLead = {
            Name: input.name,
            BidDate: input.dueDate,
            CreateDate: input.postedDate,
            SolicitationNumber: input.solicitationNumber,
            Naics: Array.isArray(input.naicsCategory) ? input.naicsCategory : [input.naicsCategory],
            City: input.city,
            State: input.state,
            Country: input.country,
            Description: input.description
        };

        const potentialClient = await optionalsToPotentialClient(nango, input.federalAgency);

        data.PotentialClient = potentialClient;

        const response = await nango.post({
            endpoint: '/api/leads',
            data: [data],
            retries: 3
        });

        const mapped = toLead(response.data[0], input);

        mapped.federalAgency = input.federalAgency;

        return mapped;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function validate(nango: NangoActionLocal, input: CreateLead) {
    type leads = keyof CreateLead;
    const required: leads[] = ['name', 'dueDate', 'postedDate', 'solicitationNumber', 'naicsCategory', 'city', 'state', 'country', 'description'];

    required.forEach((field) => {
        if (!input[field]) {
            throw new nango.ActionError({
                message: `${field} is required to create a lead`,
                code: `missing_${field}`
            });
        }
    });

    if (!input.federalAgency) {
        throw new nango.ActionError({
            message: 'federalAgency is required to create a lead',
            code: 'missing_federalAgency'
        });
    }

    if (!input.federalAgency.name) {
        throw new nango.ActionError({
            message: 'federalAgency.name is required to create a lead',
            code: 'missing_federalAgency_name'
        });
    }

    if (!input.federalAgency.companyId) {
        throw new nango.ActionError({
            message: 'federalAgency.companyId is required to create a lead',
            code: 'missing_federalAgency_companyId'
        });
    }
}
