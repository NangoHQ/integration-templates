import type { NangoAction, Group, OktaAddGroup, ProxyConfiguration, ActionResponseError } from '../../models';
import { toGroup, createGroup } from '../mappers/toGroup.js';
import { oktaAddGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<Group> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: oktaAddGroupSchema, input });

    const oktaGroup = createGroup(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/addGroup
        endpoint: '/api/v1/groups',
        data: oktaGroup,
        retries: 10
    };

    const response = await nango.post(config);

    return toGroup(response.data);
}
