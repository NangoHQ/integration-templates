import { createAction } from 'nango';
import { toGroup, createGroup } from '../mappers/toGroup.js';
import { oktaAddGroupSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { Group, OktaAddGroup } from '../models.js';

const action = createAction({
    description: 'Adds a new group with the OKTA_GROUP type to your org',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/group'
    },

    input: OktaAddGroup,
    output: Group,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<Group> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: oktaAddGroupSchema, input });

        const oktaGroup = createGroup(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/addGroup
            endpoint: '/api/v1/groups',
            data: oktaGroup,
            retries: 3
        };

        const response = await nango.post(config);

        return toGroup(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
