import type { NangoAction, ProxyConfiguration, ZapierCreateUser, ZapierResponse } from '../../models';
import { validateZapierUserSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: ZapierCreateUser): Promise<ZapierResponse> {
    const parsedInput = validateZapierUserSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://docs.zapier.com/partner-solutions/api-reference/accounts/create-account
        endpoint: `/v2/authorize`,
        retries: 10,
        headers: {
            Authorization: input.client_id
        }
    };

    config.params = {
        client_id: input.client_id,
        redirect_uri: input.redirect_uri,
        response_type: 'token',
        scope: input.scope,
        sign_up_email: input.email,
        sign_up_first_name: input.firstName,
        sign_up_last_name: input.lastName,
        ...(input.referer && { referer: input.referer }),
        ...(input.utm_campaign && { utm_campaign: input.utm_campaign }),
        ...(input.utm_content && { utm_content: input.utm_content }),
        ...(input.utm_medium && { utm_medium: input.utm_medium }),
        ...(input.utm_source && { utm_source: input.utm_source })
    };

    const response = await nango.get(config);
    return {
        success: response.status >= 400 ? false : true,
        statusCode: response.status
    };
}
