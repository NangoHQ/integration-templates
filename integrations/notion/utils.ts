import type { NangoSync, NangoAction, ProxyConfiguration } from '../models';

export const serialize = (value: any) => {
    return value === null || value === undefined ? '' : String(value);
};

export const defaultStringLength = (value: any) => {
    return value.length;
};

export const toAlignment = (value: any) => {
    const code = typeof value === 'string' ? value.codePointAt(0) : 0;

    return code === 67 /* `C` */ || code === 99 /* `c` */
        ? 99 /* `c` */
        : code === 76 /* `L` */ || code === 108 /* `l` */
          ? 108 /* `l` */
          : code === 82 /* `R` */ || code === 114 /* `r` */
            ? 114 /* `r` */
            : 0;
};

export const fetchBlocks = async (nango: NangoSync | NangoAction, id: string) => {
    return paginate(nango, 'get', `/v1/blocks/${id}/children`, 'Notion blocks', 100);
};

export const paginate = async (nango: NangoSync | NangoAction, method: 'get' | 'post', endpoint: string, desc: string, pageSize = 100, incremental = false) => {
    let cursor: string | undefined;
    let pageCounter = 0;
    let results: any[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        await nango.log(`Fetching ${desc} ${pageCounter * pageSize + 1} to ${++pageCounter * pageSize}`);

        const postData: Record<string, number | string | Record<string, string>> = {
            page_size: pageSize
        };

        if (cursor) {
            postData['start_cursor'] = cursor;
        }

        if (incremental && isNangoSync(nango) && nango.lastSyncDate) {
            postData['sort'] = {
                direction: 'ascending',
                timestamp: 'last_edited_time'
            };
        }

        const config: ProxyConfiguration = {
            method,
            endpoint,
            data: method === 'post' ? postData : {},
            params: method === 'get' ? { page_size: `${pageSize}`, start_cursor: String(cursor) } : {},
            retries: 10 // Exponential backoff + long-running job = handles rate limits well.
        };

        await nango.log(`Fetching ${desc} with config: ${JSON.stringify(config, null, 2)}`);

        try {
            const res = await nango.proxy(config);

            if (
                incremental &&
                isNangoSync(nango) &&
                nango.lastSyncDate &&
                res.data.results.length &&
                new Date(res.data.results[res.data.results.length - 1].last_edited_time) < nango.lastSyncDate
            ) {
                results = results.concat(res.data.results.filter((result: any) => new Date(result.last_edited_time) >= nango.lastSyncDate!));
                break;
            } else {
                results = results.concat(res.data.results);
            }

            if (!res.data.has_more || !res.data.next_cursor) {
                break;
            } else {
                cursor = res.data.next_cursor;
            }
        } catch (e: any) {
            const response = e.response;
            if (
                response.data &&
                response.data.status === 400 &&
                response.data.code === 'validation_error' &&
                response.data.message === 'Block type external_object_instance_page is not supported via the API.'
            ) {
                await nango.log(`Skipping unsupported block type external_object_instance_page for ${config.endpoint}`), { level: 'warn' };
                break;
            } else {
                throw e;
            }
        }
    }

    return results;
};

// Type guard to check if nango is of type NangoSync
function isNangoSync(nango: NangoSync | NangoAction): nango is NangoSync {
    return 'lastSyncDate' in nango;
}
