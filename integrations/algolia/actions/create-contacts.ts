import type { NangoAction, AlgoliaContact, AlgoliaCreateContactInput } from '../../models';

export default async function runAction(nango: NangoAction, input: AlgoliaCreateContactInput): Promise<AlgoliaContact> {
    if (!input.name) {
        throw new nango.ActionError({
            message: 'name is a required field'
        });
    }

    const endpoint = `/1/indexes/contacts`;

    const postData = {
        name: input.name,
        company: input.company,
        email: input.email
    };
    const resp = await nango.post({
        endpoint: endpoint,
        data: postData,
        retries: 3
    });

    return {
        createdAt: resp.data.createdAt,
        taskID: resp.data.taskID,
        objectID: resp.data.objectID
    };
}
