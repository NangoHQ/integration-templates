import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to disable a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid id provided to disable a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://smartsheet.redoc.ly/tag/users/#operation/deactivate-user
        endpoint: `/2.0/users/${encodeURIComponent(parsedInput.data.id)}/deactivate`,
        retries: 10
    };

    await nango.post(config);

    return {
        success: true
    };
}
