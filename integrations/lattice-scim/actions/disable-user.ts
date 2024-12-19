import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Id is required to disable a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.toriihq.com/docs/lattice-disable-user
        endpoint: `scim/v2/Users/${encodeURIComponent(parsedInput.data.id)}`,
        retries: 10,
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
