import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import getKpisChannel from '../actions/get-kpis-channel.js';
import getKpisChannelBreakdown from '../actions/get-kpis-channel-breakdown.js';
import getKpisChannelExport from '../actions/get-kpis-channel-export.js';
import getKpisChannels from '../actions/get-kpis-channels.js';
import getKpisDiscountCodes from '../actions/get-kpis-discount-codes.js';
import getKpisNvrChannel from '../actions/get-kpis-nvr-channel.js';
import getKpisNvr from '../actions/get-kpis-nvr.js';
import getKpisOverview from '../actions/get-kpis-overview.js';
import syncKpisChannels from '../syncs/kpis-channels.js';
import syncKpisDiscountCodes from '../syncs/kpis-discount-codes.js';
import syncKpisNvr from '../syncs/kpis-nvr.js';
import syncKpisOverview from '../syncs/kpis-overview.js';

const siteId = '00000000-0000-4000-8000-000000000001';
const baseInput = {
    siteIds: [siteId],
    presetId: 'preset-test',
    startDate: '2026-09-09',
    endDate: '2026-09-10',
    granularity: 'none'
};

const overall = { fixed: {}, total: {}, returning: {}, new: {} };
const breakdown = {
    data: [],
    pagination: { offset: 0, limit: 25, total: 0, has_next_page: false, detail: 'none' }
};

const actionResponses = {
    overview: { overall },
    channels: { overall, channels: {} },
    channel: { channel: 'google', overall },
    'channel-breakdown': {
        channel: 'google',
        breakdown_dimension: 'campaign',
        overall,
        breakdown
    },
    'channel-export-status': { task_id: 'task-1', detail: 'queued' },
    'nvr-channel': [{ date: '2026-09-10', new_vs_returning: 'total', channel: 'google' }],
    nvr: [{ date: '2026-09-10', new_vs_returning: 'total', channel: 'google' }],
    'discount-codes': { overall, breakdown }
} as const;

const actions = [
    ['overview', getKpisOverview, '/analytics/api/v1/kpis/overview/', {}],
    ['channels', getKpisChannels, '/analytics/api/v1/kpis/channels/', { channels: ['google'] }],
    ['channel', getKpisChannel, '/analytics/api/v1/kpis/channels/google/', { channel: 'google' }],
    ['channel-breakdown', getKpisChannelBreakdown, '/analytics/api/v1/kpis/channels/google/campaign', { channel: 'google', breakdownDimension: 'campaign' }],
    ['channel-export-status', getKpisChannelExport, '/analytics/api/v1/kpis/channels/google/exports/task-1', { channel: 'google', taskId: 'task-1' }],
    ['nvr-channel', getKpisNvrChannel, '/analytics/api/v1/kpis/nvr_daily_breakdown/google', { channel: 'google' }],
    ['nvr', getKpisNvr, '/analytics/api/v1/kpis/nvr_daily_breakdown', {}],
    ['discount-codes', getKpisDiscountCodes, '/analytics/api/v1/kpis/discount_codes', {}]
] as const;

describe('Tracify Analytics public templates', () => {
    it('registers exactly the read-only actions and syncs in the central index', async () => {
        const index = await readFile(new URL('../../index.ts', import.meta.url), 'utf8');
        const start = index.indexOf('// -- Integration: tracify');
        const end = index.indexOf('// -- Integration: twilio', start);
        const imports = [...index.slice(start, end).matchAll(/'\.\/tracify\/([^']+)\.js'/g)].map((match) => match[1]);

        expect(imports).toHaveLength(12);
        expect(imports).not.toContain('actions/create-kpis-channel-export');
        await Promise.all(imports.map((entry) => access(new URL(`../../tracify/${entry}.ts`, import.meta.url))));
    });

    it('exposes eight GET-only KPI retrieval actions with the documented provider routes', async () => {
        for (const [name, action, expectedPath, extraInput] of actions) {
            const input = action.input.parse({ ...baseInput, ...extraInput });
            const calls: { endpoint: string; method?: string; retries?: number; params?: Record<string, unknown> }[] = [];
            const nango = {
                proxy: async (request: { endpoint: string; method?: string; retries?: number; params?: Record<string, unknown> }) => {
                    calls.push(request);
                    return { data: actionResponses[name] };
                }
            };

            await action.exec(nango as never, input as never);

            expect(calls, name).toHaveLength(1);
            expect(calls[0]?.method, name).toBe('GET');
            expect(calls[0]?.retries, name).toBe(3);
            expect(calls[0]?.endpoint, name).toBe(expectedPath);
            expect(calls[0]?.params?.['csids'], name).toEqual([siteId]);
            expect(calls[0]?.params?.['preset_id'], name).toBe(name === 'channel-export-status' ? undefined : 'preset-test');
            if (name === 'channels') {
                expect(calls[0]?.params?.['channels'], name).toEqual(['google']);
            }
        }
    });

    it('rejects an NVR request spanning more than seven days', () => {
        expect(() => getKpisNvr.input.parse({ ...baseInput, startDate: '2026-09-01', endDate: '2026-09-10' })).toThrow(
            'NVR time ranges must not exceed 7 days'
        );
        expect(() => getKpisNvr.input.parse({ ...baseInput, startDate: '2026-09-10', endDate: '2026-09-09' })).toThrow(
            'NVR time ranges must not exceed 7 days'
        );
    });

    it('defines the four documented read-only KPI syncs', () => {
        expect(Object.keys(syncKpisOverview.models)).toEqual(['TracifyKpiOverview']);
        expect(Object.keys(syncKpisChannels.models)).toEqual(['TracifyKpiChannels']);
        expect(Object.keys(syncKpisDiscountCodes.models)).toEqual(['TracifyKpiDiscountCodes']);
        expect(Object.keys(syncKpisNvr.models)).toEqual(['TracifyKpiNvr']);
    });

    it('uses action and sync retry policies and closes full-refresh delete tracking after saving', async () => {
        const syncs = [
            [syncKpisOverview, 'TracifyKpiOverview'],
            [syncKpisChannels, 'TracifyKpiChannels'],
            [syncKpisDiscountCodes, 'TracifyKpiDiscountCodes'],
            [syncKpisNvr, 'TracifyKpiNvr']
        ] as const;

        for (const [sync, model] of syncs) {
            const calls: { type: string; retries?: number; model?: string }[] = [];
            const dataByModel = {
                TracifyKpiOverview: { overall },
                TracifyKpiChannels: { overall, channels: {} },
                TracifyKpiDiscountCodes: { overall, breakdown },
                TracifyKpiNvr: [{ date: '2026-09-10', new_vs_returning: 'total', channel: 'google' }]
            } as const;
            const nango = {
                getConnection: async () => ({ connection_config: { siteId, presetId: 'preset-test' } }),
                proxy: async (request: { retries: number }) => {
                    calls.push({ type: 'proxy', retries: request.retries });
                    return { data: dataByModel[model] };
                },
                batchSave: async () => {
                    calls.push({ type: 'batch-save' });
                },
                trackDeletesStart: async (trackedModel: string) => {
                    calls.push({ type: 'track-start', model: trackedModel });
                },
                trackDeletesEnd: async (trackedModel: string) => {
                    calls.push({ type: 'track-end', model: trackedModel });
                },
                log: async () => undefined
            };

            await sync.exec(nango as never);

            expect(calls[0]).toEqual({ type: 'track-start', model });
            expect(calls[1]).toEqual({ type: 'proxy', retries: 10 });
            expect(calls.at(-1)).toEqual({ type: 'track-end', model });
        }
    });

    it('rejects malformed provider responses at action boundaries', () => {
        expect(() => getKpisOverview.output.parse({ overall: {} })).toThrow();
        expect(() => getKpisChannels.output.parse({ overall, channels: { google: {} } })).toThrow();
        expect(() => getKpisNvr.output.parse([{ channel: 'google' }])).toThrow();
        expect(() => getKpisChannelExport.output.parse({ task_id: 'task-1', detail: 'queued' })).not.toThrow();
    });

    it('declares one NVR array element per persisted record', () => {
        expect(() =>
            syncKpisNvr.models.TracifyKpiNvr.parse({
                id: 'record-1',
                endpoint: 'kpis-nvr',
                fetched_at: '2026-09-10T00:00:00.000Z',
                data: { date: '2026-09-10', new_vs_returning: 'total', channel: 'google' }
            })
        ).not.toThrow();
    });
});
