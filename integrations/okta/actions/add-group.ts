import type { NangoAction, Group, OktaAddGroup, ProxyConfiguration, ActionResponseError } from '../../models';
import { toGroup, createGroup } from '../mappers/toGroup.js';
import { oktaAddGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAddGroup): Promise<Group> {
    nango.zodValidateInput({ zodSchema: oktaAddGroupSchema, input });

    const response = await nango.post(config);

    return toGroup(response.data);
}
