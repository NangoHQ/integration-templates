import type { NangoAction } from '../../models';

export default async function runAction(nango: NangoAction, _input?: void): Promise<void> {
    const response = await nango.get({
        endpoint: '/api/leads',
        retries: 10
    });

    return response.data;
}
