import type { NangoAction, FirefliesAddtoLiveResponse, FirefliesAddtoLiveInput } from '../../models';

export default async function runAction(nango: NangoAction, input: FirefliesAddtoLiveInput): Promise<FirefliesAddtoLiveResponse> {
    if (!input.query) {
        throw new nango.ActionError({
            message: 'query is required'
        });
    } else if (!input.variables) {
        throw new nango.ActionError({
            message: 'variables are required'
        });
    }

    const endpoint = `/graphql`;

    const postData = {
        query: input.query,
        variables: input.variables
    };

    const resp = await nango.post({
        endpoint: endpoint,
        data: postData
    });

    return {
        data: resp.data
    };
}
