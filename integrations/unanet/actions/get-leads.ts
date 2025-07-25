import type { NangoAction } from '../../models.js';

export default async function runAction(nango: NangoAction, _input?: void): Promise<void> {
    const response = await nango.get({
        endpoint: '/api/leads',
        retries: 3
    });

    return response.data;
}
