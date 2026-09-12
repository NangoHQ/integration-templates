/* Omnisend transport boundary: provider responses remain unknown until parsed. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createHash } from 'node:crypto';
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
};

export type CollectionSyncConfig = {
    method: 'GET';
    path: string;
    model: string;
    collectionKey: string;
    idField: string;
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

export async function callOmnisend(
    nango: ProxyClient,
    method: OmnisendMethod,
    path: string,
    input: RequestInput
): Promise<{ data: unknown }> {
    const configuration: ProxyConfiguration = {
        // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
        endpoint: encodePath(`/api${path}`, input),
        method,
        headers: { 'Omnisend-Version': API_VERSION },
        params: toQuery(path, input),
        retries: 3
    };
    if (input['body'] !== undefined) configuration.data = input['body'];
    return nango.proxy(configuration);
}

function stableId(item: Record<string, unknown>, idField: string): string {
    const providerId = item[idField] ?? item['id'];
    if (typeof providerId === 'string' || typeof providerId === 'number') return String(providerId);
    return createHash('sha256').update(JSON.stringify(item)).digest('hex');
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
    const records: Array<{ id: string; data: unknown }> = [];
    const seenCursors = new Set<string>();
    let after: string | undefined;
    let complete = false;

    for (let page = 0; page < MAX_PAGES; page += 1) {
        const input: RequestInput = { limit: PAGE_SIZE };
        if (after) input['after'] = after;
        const response = await callOmnisend(nango, config.method, config.path, input);
        const data = response.data;
        const items = pageItems(data, config.collectionKey);
        records.push(...items.map((item) => ({ id: stableId(item, config.idField), data: item })));

        const paging = data && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>)['paging']
            : undefined;
        const pagingObject = paging && typeof paging === 'object' && !Array.isArray(paging)
            ? (paging as Record<string, unknown>)
            : undefined;
        const cursors = pagingObject?.['cursors'];
        const next = cursors && typeof cursors === 'object' && !Array.isArray(cursors)
            ? (cursors as Record<string, unknown>)['after']
            : undefined;
        const hasMore = pagingObject?.['hasMore'] === true;
        if (!hasMore) {
            complete = true;
            break;
        }
        if (typeof next !== 'string' || next.length === 0) {
            throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: missing next cursor`);
        }
        if (seenCursors.has(next) || next === after) {
            throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: repeated cursor`);
        }
        seenCursors.add(next);
        after = next;
    }

    if (!complete) {
        throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: maximum page limit reached`);
    }

    await nango.batchSave(records as never[], config.model as never);
    await nango.trackDeletesEnd(config.model as never);
}
