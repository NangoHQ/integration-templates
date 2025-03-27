import type { AshbyResponse, ChangeSource, ChangeStage, NangoAction, ProxyConfiguration, UpdateHistory } from '../../models.js';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type SupportedInput = ChangeSource | ChangeStage | UpdateHistory;

export default async function runAction(nango: NangoAction, input: SupportedInput): Promise<AshbyResponse> {
    let config: ProxyConfiguration;

    if ('sourceId' in input) {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }
        if (!input.sourceId) {
            throw new nango.ActionError({
                message: 'sourceId is a required field'
            });
        }
        config = {
            endpoint: '/application.change_source',
            data: input
        };
    } else if ('interviewStageId' in input) {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }
        if (!input.interviewStageId) {
            throw new nango.ActionError({
                message: 'interviewStageId is a required field'
            });
        }
        config = {
            endpoint: '/application.change_stage',
            data: input
        };
    } else if ('applicationHistory' in input) {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }
        if (!input.applicationHistory) {
            throw new nango.ActionError({
                message: 'applicationHistory is a required field'
            });
        }
        config = {
            endpoint: '/application.updateHistory',
            data: input
        };
    } else {
        throw new nango.ActionError({
            message: 'Unsupported input type'
        });
    }

    const response = await nango.post({ ...config, retries: 3 });
    return {
        success: response.data.success,
        errors: response.data?.errors,
        results: response.data?.results
    };
}
