import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/delete/
        // TODO: update once util function to fetch accountId is generated
        // endpoint: `/restapi/v2.1/accounts/${input.accountId}/users`,
        endpoint: `/restapi/v2.1/accounts/b446da56-e1e5-4717-a5be-6a1bd26d7f1d/users`,
        data: {
            users: [{ userId: parsedInput.data.id }]
        },
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
