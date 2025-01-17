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
        // https://help.zapier.com/hc/en-us/articles/8496291497741-Provision-user-accounts-with-SCIM#h_01HE8NPZMWDB3JG39AKV820GCX
        endpoint: `scim/v2/Users/${parsedInput.data.id}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
