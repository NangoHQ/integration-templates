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

const actions = [
    ['overview', getKpisOverview, '/analytics/api/v1/kpis/overview/', {}],
    ['channels', getKpisChannels, '/analytics/api/v1/kpis/channels/', {}],
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
                    return { data: { overall: {} } };
                }
            };

            await action.exec(nango as never, input as never);

            expect(calls, name).toHaveLength(1);
            expect(calls[0]?.method, name).toBe('GET');
            expect(calls[0]?.retries, name).toBe(3);
            expect(calls[0]?.endpoint, name).toBe(expectedPath);
            expect(calls[0]?.params?.['csids'], name).toEqual([siteId]);
            expect(calls[0]?.params?.['preset_id'], name).toBe(name === 'channel-export-status' ? undefined : 'preset-test');
        }
    });

    it('rejects an NVR request spanning more than seven days', () => {
        expect(() => getKpisNvr.input.parse({ ...baseInput, startDate: '2026-09-01', endDate: '2026-09-10' })).toThrow(
            'NVR time ranges must not exceed 7 days'
        );
    });

    it('defines the four documented read-only KPI syncs', () => {
        expect(Object.keys(syncKpisOverview.models)).toEqual(['TracifyKpiOverview']);
        expect(Object.keys(syncKpisChannels.models)).toEqual(['TracifyKpiChannels']);
        expect(Object.keys(syncKpisDiscountCodes.models)).toEqual(['TracifyKpiDiscountCodes']);
        expect(Object.keys(syncKpisNvr.models)).toEqual(['TracifyKpiNvr']);
    });

    it('uses the sync retry policy and clears records from prior full-sync executions', async () => {
        const syncs = [
            [syncKpisOverview, 'TracifyKpiOverview'],
            [syncKpisChannels, 'TracifyKpiChannels'],
            [syncKpisDiscountCodes, 'TracifyKpiDiscountCodes'],
            [syncKpisNvr, 'TracifyKpiNvr']
        ] as const;

        for (const [sync, model] of syncs) {
            const calls: { type: string; retries?: number; model?: string }[] = [];
            const nango = {
                getConnection: async () => ({ connection_config: { siteId, presetId: 'preset-test' } }),
                proxy: async (request: { retries?: number }) => {
                    calls.push({ type: 'proxy', retries: request.retries });
                    return { data: { overall: {} } };
                },
                batchSave: async () => {
                    calls.push({ type: 'batch-save' });
                },
                deleteRecordsFromPreviousExecutions: async (deletedModel: string) => {
                    calls.push({ type: 'delete-previous', model: deletedModel });
                },
                log: async () => undefined
            };

            await sync.exec(nango as never);

            expect(calls[0]).toEqual({ type: 'proxy', retries: 10 });
            expect(calls.at(-1)).toEqual({ type: 'delete-previous', model });
        }
    });
});
