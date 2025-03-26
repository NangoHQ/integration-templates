import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developers.toriihq.com/docs/lattice-disable-user
        endpoint: `scim/v2/Users/${encodeURIComponent(parsedInput.data.id)}`,
        retries: 3,
        data: {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: [
                {
                    op: 'replace',
                    path: 'active',
                    value: false
                }
            ]
        }
    };

    await nango.patch(config);

    return {
        success: true
    };
}
