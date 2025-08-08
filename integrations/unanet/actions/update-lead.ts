import { createAction } from 'nango';
import type { UnanetLead } from '../types.js';
import { toLead } from '../mappers/to-lead.js';
import { optionalsToPotentialClient } from '../mappers/federal-agency.js';

import { Lead, UpdateLead } from '../models.js';

const action = createAction({
    description:
        'Update a lead with any changed information about the federal agency, the name, due date, posted date, solicitation number, naics category or categories, the city, state, country, and description.',
    version: '2.0.0',

    endpoint: {
        method: 'PUT',
        path: '/leads',
        group: 'Leads'
    },

    input: UpdateLead,
    output: Lead,

    exec: async (nango, input): Promise<Lead> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'ID is required to update a lead',
                code: 'missing_id'
            });
        }

        const data: Partial<UnanetLead> = {
            Name: input.name
        };

        if (input.description) {
            data.Description = input.description;
        }

        if (input.dueDate) {
            data.BidDate = input.dueDate;
        }

        if (input.postedDate) {
            data.CreateDate = input.postedDate;
        }

        if (input.solicitationNumber) {
            data.SolicitationNumber = input.solicitationNumber;
        }

        if (input.naicsCategory) {
            data.Naics = Array.isArray(input.naicsCategory) ? input.naicsCategory : [input.naicsCategory];
        }

        if (input.city) {
            data.City = input.city;
        }

        if (input.state) {
            data.State = input.state;
        }

        if (input.country) {
            data.Country = input.country;
        }

        const potentialClient = await optionalsToPotentialClient(nango, input.federalAgency);

        data.PotentialClient = potentialClient;

        const response = await nango.put({
            endpoint: `/api/leads/${input.id}`,
            data,
            retries: 3
        });

        return toLead(response.data, input);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
