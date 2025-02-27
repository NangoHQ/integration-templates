import type { NangoAction } from '../../models';
import type { Group, OktaAddGroup } from '../.nango/schema';
import { toGroup, createGroup } from '../mappers/toGroup.js';
import { oktaAddGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<Group> {
    nango.zodValidateInput({ zodSchema: oktaAddGroupSchema, input });

    const oktaGroup = createGroup(input);
    const config = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/createGroup
        endpoint: '/api/v1/groups',
        data: oktaGroup,
        retries: 10
    };
    
    const response = await nango.post(config);

    return toGroup(response.data);
}
