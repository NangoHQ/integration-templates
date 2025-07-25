import type { NangoAction, UpdateApplicationInput, Application, ProxyConfiguration } from '../../models.js';
import type { GemApplication } from '../types.js';
import { toApplication } from '../mappers/to-application.js';

export default async function runAction(nango: NangoAction, input: UpdateApplicationInput): Promise<Application> {
    const { application_id, ...data } = input;

    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/ats/v0/reference#tag/Application/paths/~1ats~1v0~1applications~1%7Bapplication_id%7D/patch
        endpoint: `ats/v0/applications/${application_id}`,
        data,
        retries: 3
    };

    const { data: responseData } = await nango.patch<GemApplication>(proxyConfig);
    return toApplication(responseData);
}
