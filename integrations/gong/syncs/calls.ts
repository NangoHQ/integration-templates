import type { GongCallOutput, GongConnectionMetadata, NangoSync, ProxyConfiguration } from '../../models';
import { toCall } from '../mappers/to-call.js';
import type { AxiosError, GongCallExtensive, GongCallResponse, GongError } from '../types';
import { ExposedFieldsKeys } from '../types.js';

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

export default async function fetchData(nango: NangoSync): Promise<void> {
    let fetchSince: Date;
    if (nango.lastSyncDate) {
        fetchSince = nango.lastSyncDate;
    } else {
        const metadata = await nango.getMetadata<GongConnectionMetadata>();
        const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
        fetchSince = new Date(Date.now() - backfillMilliseconds);
    }
    const toDateTime = new Date();
    await nango.log(`Fetching Gong calls from ${fetchSince.toISOString()} to ${toDateTime.toISOString()}`);

    const proxyConfig: ProxyConfiguration = {
        // https://app.gong.io/settings/api/documentation#get-/v2/calls
        endpoint: '/v2/calls',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'records.cursor',
            response_path: 'calls'
        },
        params: {
            fromDateTime: fetchSince.toISOString(),
            toDateTime: toDateTime.toISOString()
        }
    };

    const calls: GongCallOutput[] = [];

    // @allowTryCatch
    try {
        for await (const records of nango.paginate<GongCallResponse>(proxyConfig)) {
            const callIds = records.map((record) => record.id);

            if (callIds.length > 0) {
                const extensiveDetails = await fetchExtensiveDetails(nango, callIds);
                const mappedCalls = extensiveDetails.map(toCall);
                calls.push(...mappedCalls);
            }
        }

        await nango.batchSave(calls, 'GongCallOutput');
    } catch (error: any) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
        const emptyResult = errors.includes('No calls found corresponding to the provided filters');

        if (emptyResult) {
            await nango.log('No calls found for the given filters, skipping sync.');
        } else {
            throw error;
        }
    }
}

async function fetchExtensiveDetails(nango: NangoSync, callIds: string[]): Promise<GongCallExtensive[]> {
    const extensiveDetails: GongCallExtensive[] = [];
    const config: ProxyConfiguration = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/extensive
        endpoint: '/v2/calls/extensive',
        data: {
            filter: {
                callIds
            },
            contentSelector: { exposedFields: ExposedFieldsKeys }
        },
        retries: 10,
        method: 'POST',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'records.cursor',
            in_body: true,
            response_path: 'calls'
        }
    };

    // @allowTryCatch
    try {
        for await (const page of nango.paginate<GongCallExtensive>(config)) {
            extensiveDetails.push(...page);
        }

        return extensiveDetails;
    } catch (error: any) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
        const emptyResult = errors.includes('No calls found corresponding to the provided filters');
        if (emptyResult) {
            return extensiveDetails;
        } else {
            throw error;
        }
    }
}
