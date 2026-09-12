/* Omnisend transport boundary: provider responses remain unknown until parsed. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import type { ProxyConfiguration } from 'nango';

export type OmnisendMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type RequestInput = Record<string, unknown>;

type ProxyClient = {
    proxy: (configuration: ProxyConfiguration) => Promise<{ data: unknown }>;
};

type MaybePromise<T> = T | Promise<T>;

type SyncClient = ProxyClient & {
    batchSave: (records: never[], model: never) => MaybePromise<boolean>;
    trackDeletesStart: (model: never) => MaybePromise<void>;
    trackDeletesEnd: (model: never) => MaybePromise<unknown>;
    getCheckpoint: () => MaybePromise<unknown | null>;
    saveCheckpoint: (checkpoint: never) => MaybePromise<void>;
    clearCheckpoint: () => MaybePromise<void>;
};

export type CollectionSyncConfig = {
    method: 'GET';
    path: string;
    model: string;
    collectionKey: string;
    idField: string;
    pagination?: 'cursor' | 'offset';
    checkpoint?: boolean;
};

const API_VERSION = '2026-03-15';
const MAX_PAGES = 1_000;
const PAGE_SIZE = 100;

function encodePath(path: string, input: RequestInput): string {
    return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const value = input[key];
        if (typeof value !== 'string' && typeof value !== 'number') {
            throw new Error(`Missing or invalid path parameter: ${key}`);
        }
        return encodeURIComponent(String(value));
    });
}

function queryValue(value: unknown): string | number | string[] | number[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return value.map((item) => String(item));
    }
    return JSON.stringify(value);
}

function toQuery(path: string, input: RequestInput): Record<string, string | number | string[] | number[]> {
    const pathKeys = new Set([...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]));
    const params: Record<string, string | number | string[] | number[]> = {};
    for (const [key, value] of Object.entries(input)) {
        if (key === 'body' || pathKeys.has(key)) continue;
        const converted = queryValue(value);
        if (converted !== undefined) params[key] = converted;
    }
    return params;
}

function imageUploadFormData(input: RequestInput): FormData {
    const body = input['body'];
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('Image upload body must contain base64 file data');
    }
    const file = (body as Record<string, unknown>)['file'];
    const name = (body as Record<string, unknown>)['name'];
    if (typeof file !== 'string' || file.length === 0) {
        throw new Error('Image upload file must be a non-empty base64 string');
    }
    const fileName = typeof name === 'string' && name.length > 0 ? name : 'omnisend-image';
    const formData = new FormData();
    formData.append('file', new Blob([Buffer.from(file, 'base64')]), fileName);
    if (typeof name === 'string' && name.length > 0) formData.append('name', name);
    return formData;
}

export async function callOmnisend(nango: ProxyClient, method: OmnisendMethod, path: string, input: RequestInput): Promise<{ data: unknown }> {
    const configuration: ProxyConfiguration = {
        // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
        endpoint: encodePath(`/api${path}`, input),
        method,
        headers: { 'Omnisend-Version': API_VERSION },
        params: toQuery(path, input),
        retries: 3
    };
    if (path === '/images/upload') {
        configuration.data = imageUploadFormData(input);
    } else if (input['body'] !== undefined) {
        configuration.data = input['body'];
    }
    return nango.proxy(configuration);
}

function stableId(item: Record<string, unknown>, idField: string): string {
    const providerId = item[idField] ?? item['id'];
    if (typeof providerId === 'string' || typeof providerId === 'number') return String(providerId);

    // Keep the fallback deterministic without importing Node built-ins, which are unavailable in the Nango sandbox.
    const serialized = JSON.stringify(item);
    let hash = 2166136261;
    for (let index = 0; index < serialized.length; index += 1) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

function pageItems(data: unknown, collectionKey: string): Array<Record<string, unknown>> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`Invalid Omnisend collection response for ${collectionKey}`);
    }
    const items = (data as Record<string, unknown>)[collectionKey];
    if (!Array.isArray(items) || !items.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        throw new Error(`Invalid Omnisend collection field: ${collectionKey}`);
    }
    return items as Array<Record<string, unknown>>;
}

export async function runCollectionSync(nango: SyncClient, config: CollectionSyncConfig): Promise<void> {
    await nango.trackDeletesStart(config.model as never);
    const seenCursors = new Set<string>();
    const seenOffsets = new Set<number>();
    const checkpoint = config.checkpoint ? await nango.getCheckpoint() : null;
    const checkpointData = checkpoint && typeof checkpoint === 'object' && !Array.isArray(checkpoint) ? (checkpoint as Record<string, unknown>) : undefined;
    let after = typeof checkpointData?.['after'] === 'string' ? checkpointData['after'] : undefined;
    let offset = 0;
    let complete = false;

    for (let page = 0; page < MAX_PAGES; page += 1) {
        const input: RequestInput = { limit: PAGE_SIZE };
        if (config.pagination === 'offset') {
            input['offset'] = offset;
        } else if (after) {
            input['after'] = after;
        }
        const response = await callOmnisend(nango, config.method, config.path, input);
        const data = response.data;
        const items = pageItems(data, config.collectionKey);
        const records = items.map((item) => ({ id: stableId(item, config.idField), data: item }));
        if (records.length > 0) {
            await nango.batchSave(records as never[], config.model as never);
        }

        const paging = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>)['paging'] : undefined;
        const pagingObject = paging && typeof paging === 'object' && !Array.isArray(paging) ? (paging as Record<string, unknown>) : undefined;
        const cursors = pagingObject?.['cursors'];
        const nextCursor = cursors && typeof cursors === 'object' && !Array.isArray(cursors) ? (cursors as Record<string, unknown>)['after'] : undefined;
        const nextUrl = pagingObject?.['next'];

        if (config.pagination === 'offset') {
            if (typeof nextUrl !== 'string' || nextUrl.length === 0) {
                complete = true;
                break;
            }
            let nextOffset: number | undefined;
            // @allowTryCatch: malformed provider continuation must fail closed.
            try {
                nextOffset = Number(new URL(nextUrl, 'https://api.omnisend.com').searchParams.get('offset'));
            } catch {
                nextOffset = undefined;
            }
            if (nextOffset === undefined || !Number.isInteger(nextOffset) || nextOffset < 0) {
                throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: invalid next offset`);
            }
            if (seenOffsets.has(nextOffset) || nextOffset === offset) {
                throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: repeated offset`);
            }
            seenOffsets.add(nextOffset);
            offset = nextOffset;
            continue;
        }

        const hasMore = pagingObject?.['hasMore'] === true;
        if (!hasMore) {
            complete = true;
            break;
        }
        if (typeof nextCursor !== 'string' || nextCursor.length === 0) {
            throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: missing next cursor`);
        }
        if (seenCursors.has(nextCursor) || nextCursor === after) {
            throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: repeated cursor`);
        }
        seenCursors.add(nextCursor);
        after = nextCursor;
        if (config.checkpoint) {
            await nango.saveCheckpoint({ after: nextCursor } as never);
        }
    }

    if (!complete) {
        throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: maximum page limit reached`);
    }

    if (config.checkpoint) {
        await nango.clearCheckpoint();
    }
    await nango.trackDeletesEnd(config.model as never);
}
