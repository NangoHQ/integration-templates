import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { callOmnisend, runCollectionSync } from '../shared.js';

type ProxyCall = Record<string, unknown>;

it('registers every Omnisend action and sync in the central index', async () => {
    const index = await readFile(new URL('../../index.ts', import.meta.url), 'utf8');
    const start = index.indexOf('// -- Integration: omnisend');
    const end = index.indexOf('// -- Integration: openai', start);
    const imports = [...index.slice(start, end).matchAll(/'\.\/omnisend\/([^']+)\.js'/g)].map((match) => match[1]);

    expect(imports).toHaveLength(91);
    await Promise.all(imports.map((entry) => access(new URL(`../${entry}.ts`, import.meta.url))));
});

describe('Omnisend shared request and sync contracts', () => {
    it('uses the fixed API prefix, version header, and three retries', async () => {
        const calls: ProxyCall[] = [];
        const nango = { proxy: async (config: ProxyCall) => { calls.push(config); return { data: { campaigns: [] } }; } };

        await callOmnisend(nango as never, 'GET', '/campaigns/{id}', {
            id: 'campaign id/1',
            limit: 1
        });

        expect(calls[0]).toEqual({
            endpoint: '/api/campaigns/campaign%20id%2F1',
            method: 'GET',
            headers: { 'Omnisend-Version': '2026-03-15' },
            params: { limit: 1 },
            retries: 3
        });
    });

    it('keeps write payloads out of query parameters', async () => {
        const calls: ProxyCall[] = [];
        const nango = { proxy: async (config: ProxyCall) => { calls.push(config); return { data: { id: 'draft' } }; } };

        await callOmnisend(nango as never, 'POST', '/campaigns', {
            body: { name: 'local draft only' },
            limit: 1
        });

        expect(calls[0]).toMatchObject({ method: 'POST', data: { name: 'local draft only' }, params: { limit: 1 } });
        expect(calls[0]).not.toHaveProperty('params.body');
    });

    it('saves a cursor-paginated collection before ending delete tracking', async () => {
        const events: string[] = [];
        let page = 0;
        const nango = {
            proxy: async () => {
                page += 1;
                return { data: page === 1
                    ? { campaigns: [{ id: 'a' }], paging: { hasMore: true, cursors: { after: 'next' } } }
                    : { campaigns: [{ id: 'b' }], paging: { hasMore: false } } };
            },
            trackDeletesStart: async () => { events.push('start'); },
            batchSave: async (records: unknown[], model: string) => { events.push(`save:${model}:${records.length}`); },
            trackDeletesEnd: async () => { events.push('end'); }
        };

        await runCollectionSync(nango as never, {
            method: 'GET', path: '/campaigns', model: 'OmnisendCampaign', collectionKey: 'campaigns', idField: 'id'
        });

        expect(events).toEqual(['start', 'save:OmnisendCampaign:2', 'end']);
    });

    it('does not end delete tracking after an incomplete cursor page', async () => {
        const events: string[] = [];
        let page = 0;
        const nango = {
            proxy: async () => {
                page += 1;
                return { data: page === 1
                    ? { campaigns: [{ id: 'a' }], paging: { hasMore: true } }
                    : { campaigns: [{ id: 'a' }], paging: { hasMore: true, cursors: { after: 'same' } } } };
            },
            trackDeletesStart: async () => { events.push('start'); },
            batchSave: async () => { events.push('save'); },
            trackDeletesEnd: async () => { events.push('end'); }
        };

        await expect(runCollectionSync(nango as never, {
            method: 'GET', path: '/campaigns', model: 'OmnisendCampaign', collectionKey: 'campaigns', idField: 'id'
        })).rejects.toThrow('missing next cursor');
        expect(events).toEqual(['start']);
    });

    it('does not end delete tracking after a repeated cursor or page limit', async () => {
        for (const mode of ['repeated', 'limit'] as const) {
            const events: string[] = [];
            let page = 0;
            const nango = {
                proxy: async () => {
                    page += 1;
                    const cursor = mode === 'repeated' ? 'same' : `cursor-${page}`;
                    return { data: { campaigns: [{ id: String(page) }], paging: { hasMore: true, cursors: { after: cursor } } } };
                },
                trackDeletesStart: async () => { events.push('start'); },
                batchSave: async () => { events.push('save'); },
                trackDeletesEnd: async () => { events.push('end'); }
            };

            await expect(runCollectionSync(nango as never, {
                method: 'GET', path: '/campaigns', model: 'OmnisendCampaign', collectionKey: 'campaigns', idField: 'id'
            })).rejects.toThrow(mode === 'repeated' ? 'repeated cursor' : 'maximum page limit reached');
            expect(events).toEqual(['start']);
        }
    });
});
