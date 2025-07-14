import type { NangoAction, OptionalObjectType, PipelineOutput } from '../../models.js';

export default async function runAction(nango: NangoAction, input: OptionalObjectType): Promise<PipelineOutput> {
    const objectType = input?.objectType || 'deal';

    const response = await nango.get({
        // https://developers.hubspot.com/docs/api/crm/pipelines
        endpoint: `/crm/v3/pipelines/${objectType}`,
        retries: 3
    });

    const { data } = response;

    return {
        pipelines: data.results
    };
}
