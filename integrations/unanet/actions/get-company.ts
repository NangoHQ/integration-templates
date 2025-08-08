import { createAction } from 'nango';

import { getCompany } from '../helpers/get-or-create-company.js';

import { Anonymous_unanet_action_getcompany_output, Entity } from '../models.js';

const action = createAction({
    description: 'Retrieve information about a company',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/company'
    },

    input: Entity,
    output: Anonymous_unanet_action_getcompany_output,

    exec: async (nango, input): Promise<Anonymous_unanet_action_getcompany_output> => {
        if (!input?.name) {
            throw new nango.ActionError({
                message: 'Name is required to create a company',
                code: 'missing_name'
            });
        }

        const company = await getCompany(nango, input.name);

        return company;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
