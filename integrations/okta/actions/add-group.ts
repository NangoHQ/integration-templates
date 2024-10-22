import type { NangoAction, Group, OktaAddGroup, ProxyConfiguration, ActionResponseError } from '../../models';
import { toGroup, createGroup } from '../mappers/toGroup.js';
import { oktaAddGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<Group> {
    const parsedInput = oktaAddGroupSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to add a group: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to add a group'
        });
    }


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
