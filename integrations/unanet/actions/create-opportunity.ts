import { createAction } from 'nango';
import type { CreateUnanetOpportunity } from '../types.js';

import { getOrCreateCompany } from '../helpers/get-or-create-company.js';
import { findStage } from '../helpers/find-stage.js';
import { toOpportunity } from '../mappers/to-opportunity.js';

import { Opportunity } from '../models.js';

const action = createAction({
    description: 'Create an opportunity in the system. Requires a stage that exists\nin the system. Use the list-stages action to find the appropriate stage.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/opportunity'
    },

    input: Opportunity,
    output: Opportunity,

    exec: async (nango, input): Promise<Opportunity> => {
        if (!input.federalAgency || !input.federalAgency.name) {
            throw new nango.ActionError({
                message: 'Company Name is required to create an opportunity',
                code: 'missing_company_name'
            });
        }

        if (!input.name) {
            throw new nango.ActionError({
                message: 'Name is required to create an opportunity',
                code: 'missing_name'
            });
        }

        if (!input.stage) {
            throw new nango.ActionError({
                message: 'Stage is required to create an opportunity',
                code: 'missing_stage'
            });
        }

        const company = await getOrCreateCompany(nango, input.federalAgency);
        const companyId = Number(company.id);

        const stage = await findStage(nango, input.stage);

        if (!stage) {
            throw new nango.ActionError({
                message: 'Stage not found. Please use a valid stage',
                code: 'stage_not_found'
            });
        }

        const opportunity: CreateUnanetOpportunity = {
            ClientId: Number(companyId),
            ClientName: company.name,
            OpportunityName: input.name,
            CloseDate: input.dueDate,
            OpportunityDescription: input.description,
            City: input.city || '',
            State: input.state || '',
            Country: input.country || '',
            Stage: input.stage,
            StageId: stage.id,
            ActiveInd: Number(input.active || true)
        };

        const response = await nango.post({
            endpoint: '/api/opportunities',
            data: [opportunity],
            retries: 3
        });

        return toOpportunity(response.data[0], input);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
