import type { NangoAction, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config = {
        // https://developers.docusign.com/docs/admin-api/reference/users/users/delete/
        endpoint: `/v2.1/accounts/${input.id}/users/${input.id}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
