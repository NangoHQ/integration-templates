/* Omnisend transport boundary: provider responses remain unknown until parsed. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import type { ProxyConfiguration } from 'nango';
import * as z from 'zod';

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

const contactConsentSchema = z
    .object({
        channel: z.enum(['email', 'sms']).optional(),
        createdAt: z.string().optional(),
        ip: z.string().optional(),
        source: z.string().optional(),
        userAgent: z.string().optional()
    })
    .passthrough();

const contactIdentifierSchema = z
    .object({
        channels: z.record(z.string(), z.unknown()).optional(),
        id: z.string().optional(),
        type: z.enum(['email', 'phone']).optional()
    })
    .passthrough();

const contactStatusSchema = z
    .object({
        channel: z.enum(['email', 'sms']).optional(),
        status: z.enum(['subscribed', 'unsubscribed', 'nonSubscribed']).optional(),
        statusChangedAt: z.string().optional()
    })
    .passthrough();

export const contactSchema = z
    .object({
        address: z.string().optional(),
        birthdate: z.string().optional(),
        city: z.string().optional(),
        consents: z.array(contactConsentSchema).optional(),
        country: z.string().optional(),
        countryCode: z.string().optional(),
        createdAt: z.string().optional(),
        customProperties: z.record(z.string(), z.unknown()).nullable().optional(),
        email: z.string().optional(),
        firstName: z.string().optional(),
        gender: z.enum(['m', 'f', '']).optional(),
        id: z.string().optional(),
        identifiers: z.array(contactIdentifierSchema).optional(),
        lastName: z.string().optional(),
        optIns: z.array(z.object({ channel: z.enum(['email', 'sms']).optional(), optInAt: z.string().optional() }).passthrough()).optional(),
        phone: z.array(z.string()).optional(),
        postalCode: z.string().optional(),
        segments: z.array(z.string()).optional(),
        state: z.string().optional(),
        status: z.enum(['subscribed', 'unsubscribed', 'nonSubscribed']).optional(),
        statuses: z.array(contactStatusSchema).optional(),
        tags: z.array(z.string()).optional(),
        updatedAt: z.string().optional()
    })
    .passthrough();

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
    if (typeof file !== 'string' || file.length === 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file)) {
        throw new Error('Image upload file must be a non-empty base64 string');
    }
    let decoded: Buffer;
    // @allowTryCatch: invalid base64 must be rejected before creating a multipart body.
    try {
        decoded = Buffer.from(file, 'base64');
    } catch {
        throw new Error('Image upload file must be valid base64');
    }
    if (decoded.length === 0 || decoded.toString('base64') !== file) {
        throw new Error('Image upload file must be valid base64');
    }
    const fileName = typeof name === 'string' && name.length > 0 ? name : 'omnisend-image';
    const formData = new FormData();
    formData.append('file', new Blob([decoded]), fileName);
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

    // Keep the fallback deterministic without importing Node built-ins. Two independent
    // 32-bit lanes provide a 64-bit identifier and materially reduce collision risk.
    const serialized = JSON.stringify(item);
    let first = 2166136261;
    let second = 5381;
    for (let index = 0; index < serialized.length; index += 1) {
        const code = serialized.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 16777619);
        second = Math.imul(second, 33) ^ code;
    }
    return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
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
    const seenCursors = new Set<string>();
    const seenOffsets = new Set<number>([0]);
    const checkpoint = config.checkpoint ? await nango.getCheckpoint() : null;
    if (config.checkpoint && checkpoint !== null && (typeof checkpoint !== 'object' || Array.isArray(checkpoint))) {
        throw new Error(`Invalid Omnisend checkpoint for ${config.collectionKey}`);
    }
    const checkpointData = checkpoint && typeof checkpoint === 'object' && !Array.isArray(checkpoint) ? (checkpoint as Record<string, unknown>) : undefined;
    if (
        config.checkpoint &&
        checkpointData &&
        checkpointData['after'] !== undefined &&
        (typeof checkpointData['after'] !== 'string' || checkpointData['after'].length === 0)
    ) {
        throw new Error(`Invalid Omnisend checkpoint for ${config.collectionKey}: missing after cursor`);
    }
    let after = typeof checkpointData?.['after'] === 'string' ? checkpointData['after'] : undefined;
    const resumed = after !== undefined;
    let offset = 0;
    let complete = false;
    const pages: Array<{ records: Array<Record<string, unknown>>; checkpointAfter?: string }> = [];

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
        const paging = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>)['paging'] : undefined;
        const pagingObject = paging && typeof paging === 'object' && !Array.isArray(paging) ? (paging as Record<string, unknown>) : undefined;
        const cursors = pagingObject?.['cursors'];
        const nextCursor = cursors && typeof cursors === 'object' && !Array.isArray(cursors) ? (cursors as Record<string, unknown>)['after'] : undefined;
        const nextUrl = pagingObject?.['next'];

        if (config.pagination === 'offset') {
            if (typeof nextUrl !== 'string' || nextUrl.length === 0) {
                pages.push({ records });
                complete = true;
                break;
            }
            let nextOffset: number | undefined;
            // @allowTryCatch: malformed provider continuation must fail closed.
            try {
                const nextOffsetValue = new URL(nextUrl, 'https://api.omnisend.com').searchParams.get('offset');
                if (nextOffsetValue === null || nextOffsetValue.length === 0) {
                    throw new Error('missing offset');
                }
                nextOffset = Number(nextOffsetValue);
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
            pages.push({ records });
            offset = nextOffset;
            continue;
        }

        const hasMore = pagingObject?.['hasMore'] === true;
        if (!hasMore) {
            pages.push({ records });
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
        pages.push({ records, checkpointAfter: nextCursor });
        after = nextCursor;
    }

    if (!complete) {
        throw new Error(`Incomplete Omnisend pagination for ${config.collectionKey}: maximum page limit reached`);
    }

    if (!resumed) {
        await nango.trackDeletesStart(config.model as never);
    }
    for (const page of pages) {
        if (page.records.length > 0) {
            await nango.batchSave(page.records as never[], config.model as never);
        }
        if (config.checkpoint && page.checkpointAfter) {
            await nango.saveCheckpoint({ after: page.checkpointAfter } as never);
        }
    }
    if (config.checkpoint) {
        await nango.clearCheckpoint();
    }
    if (!resumed) {
        await nango.trackDeletesEnd(config.model as never);
    }
}
