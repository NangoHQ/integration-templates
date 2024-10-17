import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { getRequestInfo } from '../helpers/get-requestInfo';
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

    const { baseUri, accountId } = await getRequestInfo(nango);

    const config: ProxyConfiguration = {
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/delete/
        baseUrlOverride: baseUri,
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
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
