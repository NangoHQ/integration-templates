import type { NangoAction, SuccessResponse, DeleteUser } from '../../models';

export default async function runAction(nango: NangoAction, input: DeleteUser): Promise<SuccessResponse> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const endpoint = `/2.0/users/${input.id}`;

    const queryParams = Object.entries({
        ...(input.force ? { force: input.force } : {}),
        ...(input.notify ? { notify: input.notify } : {})
    })
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    const params = queryParams ? `&${queryParams}` : '';
    const urlWithParams = `${endpoint}${params}`;

    const config = {
        // https://developer.box.com/reference/delete-users-id/
        endpoint: urlWithParams,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
