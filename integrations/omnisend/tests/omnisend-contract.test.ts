import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import getAutomations from '../actions/get-automations.js';
import getBatches from '../actions/get-batches.js';
import getBatchItems from '../actions/get-batches-batch-i-d-items.js';
import getBrandsCurrent from '../actions/get-brands-current.js';
import getCampaigns from '../actions/get-campaigns.js';
import getContacts from '../actions/get-contacts.js';
import getContactsId from '../actions/get-contacts-id.js';
import getEmailTemplates from '../actions/get-email-templates.js';
import getEmailUniversalLayouts from '../actions/get-email-universal-layouts.js';
import getProductCategories from '../actions/get-product-categories.js';
import getProducts from '../actions/get-products.js';
import getSegments from '../actions/get-segments.js';
import patchContacts from '../actions/patch-contacts.js';
import patchContactsId from '../actions/patch-contacts-id.js';
import postAnalyticsReports from '../actions/post-analytics-reports.js';
import postContacts from '../actions/post-contacts.js';
import postContactsTags from '../actions/post-contacts-tags.js';
import deleteContactsTags from '../actions/delete-contacts-tags.js';
import postEvents from '../actions/post-events.js';
import postImagesUpload from '../actions/post-images-upload.js';
import postAutomations from '../actions/post-automations.js';
import postAutomationsTestEmail from '../actions/post-automations-id-blocks-block-i-d-test-email.js';
import postCampaigns from '../actions/post-campaigns.js';
import postCampaignWinner from '../actions/post-campaigns-id-ab-test-winner.js';
import postBrandsCurrent from '../actions/post-brands-current.js';
import postProductCategories from '../actions/post-product-categories.js';
import postEmailTemplatesRender from '../actions/post-email-templates-id-render.js';
import postEmailUniversalLayouts from '../actions/post-email-universal-layouts.js';
import putAutomationsBlocks from '../actions/put-automations-id-blocks.js';
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
    it('accepts nullable collection fields observed in live GET responses', () => {
        expect(() => getAutomations.output.parse({ automations: [], paging: { cursors: { after: null, before: null } } })).not.toThrow();
        expect(() => getBatches.output.parse({ batches: [], paging: { next: null, previous: null } })).not.toThrow();
        expect(() => getBatchItems.output.parse({ batchID: 'batch-1', errors: [], responses: [], status: 'finished', totalCount: 0 })).not.toThrow();
        expect(() => getCampaigns.output.parse({ campaigns: [{ sendingSettings: { strategy: '' } }], paging: { cursors: { after: null, before: null } } })).not.toThrow();
        expect(() => getContacts.output.parse({ contacts: [{ customProperties: null, gender: '' }], paging: { cursors: { after: null, before: null } } })).not.toThrow();
        expect(() => getContactsId.output.parse({ customProperties: null, gender: '' })).not.toThrow();
        expect(() => getEmailTemplates.output.parse({ templates: [], paging: { cursors: { after: null, before: null } } })).not.toThrow();
        expect(() => getEmailUniversalLayouts.output.parse({ universalLayouts: [], paging: { cursors: { after: null, before: null } } })).not.toThrow();
        expect(() => getProductCategories.output.parse({ categories: [], paging: { previous: null } })).not.toThrow();
        expect(() => getProducts.output.parse({ products: [], paging: { previous: null } })).not.toThrow();
        expect(() => getSegments.output.parse({ segments: [{ archivedAt: null }], paging: { cursors: { after: null, before: null } } })).not.toThrow();
    });

    it('accepts the same nullable contact response in write actions', () => {
        const response = { customProperties: null, gender: '' };
        expect(() => postContacts.output.parse(response)).not.toThrow();
        expect(() => patchContacts.output.parse(response)).not.toThrow();
        expect(() => patchContactsId.output.parse(response)).not.toThrow();
    });

    it('requires contact, eventName, and origin', () => {
        expect(() => postEvents.input.parse({ body: { contact: { email: 'draft@example.com' }, eventName: 'draft-event', origin: 'api' } })).not.toThrow();
        expect(() => postEvents.input.parse({ body: { eventName: 'draft-event', origin: 'api' } })).toThrow();
        expect(() => postEvents.input.parse({ body: { contact: { email: 'draft@example.com' }, origin: 'api' } })).toThrow();
        expect(() => postEvents.input.parse({ body: { contact: { email: 'draft@example.com' }, eventName: 'draft-event' } })).toThrow();
    });

    it('requires non-empty tag targets and tag values', () => {
        expect(() => postContactsTags.input.parse({ body: { emails: ['draft@example.com'], tags: ['draft-tag'] } })).not.toThrow();
        expect(() => postContactsTags.input.parse({ body: { emails: [''], tags: ['draft-tag'] } })).toThrow();
        expect(() => postContactsTags.input.parse({ body: { emails: ['draft@example.com'], tags: [''] } })).toThrow();
        expect(() => postContactsTags.input.parse({ body: { tags: ['draft-tag'] } })).toThrow();
    });

    it('rejects malformed image base64 before building multipart data', () => {
        expect(() => postImagesUpload.input.parse({ body: { file: 'a-not-base64-value' } })).toThrow();
        expect(() => postImagesUpload.input.parse({ body: { file: Buffer.from('image-bytes').toString('base64') } })).not.toThrow();
    });

    it('rejects malformed write payloads at the action boundary', () => {
        expect(() => getBatches.input.parse({ offset: -1 })).toThrow();
        expect(() => patchContacts.input.parse({ email: 'draft@example.com', body: null })).toThrow();
        expect(() => patchContactsId.input.parse({ id: 'contact-1', body: [] })).toThrow();
        expect(() => postContacts.input.parse({ body: { identifiers: [] } })).toThrow();
        expect(() => deleteContactsTags.input.parse({ body: { emails: ['draft@example.com'], tags: [''] } })).toThrow();
        expect(() => postProductCategories.input.parse({ body: { categoryID: '', title: '' } })).toThrow();
        expect(() => postCampaignWinner.input.parse({ id: 'campaign-1', body: { variantID: '' } })).toThrow();
        expect(() => postAutomationsTestEmail.input.parse({ id: 'automation-1', blockID: 'block-1', body: { recipients: [] } })).toThrow();
        expect(() => postAnalyticsReports.input.parse({ body: { queries: [] } })).toThrow();
    });

    it('validates brand, render, push, webhook, and automation discriminator contracts', () => {
        expect(() => getBrandsCurrent.output.parse('malformed')).toThrow();
        expect(() => postBrandsCurrent.output.parse([])).toThrow();
        expect(() => postEmailTemplatesRender.output.parse({ html: { nested: true } })).toThrow();
        expect(() => postCampaigns.input.parse({ body: { channel: 'push', type: 'regular', content: { push: { body: 1, clickUrl: 'https://example.test', title: 'draft' } } } })).toThrow();
        expect(() => postAutomations.input.parse({ body: { name: 'draft', trigger: { condition: { event: 'draft' } }, blocks: [{ temporaryID: 'b-1', type: 'action' }] } })).toThrow();
        expect(() => putAutomationsBlocks.input.parse({ id: 'automation-1', body: { blocks: [{ temporaryID: 'b-1', type: 'action', action: { type: 'sendWebhook', sendWebhook: { body: 'draft', callbackUrl: 'http://insecure.test' } } }] } })).toThrow();
        expect(() => postEmailUniversalLayouts.input.parse({ body: { content: { settings: { customFonts: [{ id: 42 }] } } } })).toThrow();
        expect(() => postEmailTemplatesRender.output.parse({ html: 'draft' })).not.toThrow();
    });

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

        expect(events).toEqual(['start', 'save:OmnisendCampaign:1', 'save:OmnisendCampaign:1', 'end']);
    });

    it('follows offset pagination and saves each product page', async () => {
        const offsets: unknown[] = [];
        const saves: number[] = [];
        let page = 0;
        const nango = {
            proxy: async (config: ProxyCall) => {
                offsets.push((config.params as Record<string, unknown>).offset);
                page += 1;
                return { data: page === 1
                    ? { products: [{ id: 'p1' }], paging: { next: '/api/products?limit=100&offset=100' } }
                    : { products: [{ id: 'p2' }], paging: { offset: 100, limit: 100 } } };
            },
            trackDeletesStart: async () => undefined,
            batchSave: async (records: unknown[]) => { saves.push(records.length); },
            trackDeletesEnd: async () => undefined
        };

        await runCollectionSync(nango as never, {
            method: 'GET', path: '/products', model: 'OmnisendProduct', collectionKey: 'products', idField: 'id', pagination: 'offset'
        });

        expect(offsets).toEqual([0, 100]);
        expect(saves).toEqual([1, 1]);
    });

    it('validates sync items and checkpoints the next offset after each page', async () => {
        const checkpoints: unknown[] = [];
        const events: string[] = [];
        let page = 0;
        const nango = {
            getCheckpoint: async () => null,
            saveCheckpoint: async (checkpoint: unknown) => { checkpoints.push(checkpoint); },
            clearCheckpoint: async () => { events.push('clear'); },
            proxy: async () => {
                page += 1;
                return { data: page === 1
                    ? { products: [{ id: 'p1' }], paging: { next: '/api/products?offset=100' } }
                    : { products: [{ id: 'p2' }], paging: {} } };
            },
            trackDeletesStart: async () => { events.push('start'); },
            batchSave: async () => { events.push('save'); },
            trackDeletesEnd: async () => { events.push('end'); }
        };

        await runCollectionSync(nango as never, {
            method: 'GET', path: '/products', model: 'OmnisendProduct', collectionKey: 'products', idField: 'id', pagination: 'offset', checkpoint: true,
            itemSchema: z.object({ id: z.string() })
        });

        expect(checkpoints).toEqual([{ offset: 100 }]);
        expect(events).toEqual(['start', 'save', 'save', 'clear', 'end']);
    });

    it('resumes campaign cursors from a checkpoint and clears it after completion', async () => {
        const requests: unknown[] = [];
        const events: string[] = [];
        const nango = {
            getCheckpoint: async () => ({ after: 'resume-cursor' }),
            saveCheckpoint: async () => { events.push('checkpoint-save'); },
            clearCheckpoint: async () => { events.push('checkpoint-clear'); },
            proxy: async (config: ProxyCall) => {
                requests.push(config.params);
                return { data: { campaigns: [{ id: 'a' }], paging: { hasMore: false } } };
            },
            trackDeletesStart: async () => { events.push('start'); },
            batchSave: async () => { events.push('save'); },
            trackDeletesEnd: async () => { events.push('end'); }
        };

        await runCollectionSync(nango as never, {
            method: 'GET', path: '/campaigns', model: 'OmnisendCampaign', collectionKey: 'campaigns', idField: 'id', pagination: 'cursor', checkpoint: true
        });

        expect(requests).toEqual([{ limit: 100, after: 'resume-cursor' }]);
        expect(events).toEqual(['save', 'checkpoint-clear']);
    });

    it('encodes image uploads as multipart FormData', async () => {
        const calls: ProxyCall[] = [];
        const nango = { proxy: async (config: ProxyCall) => { calls.push(config); return { data: {} }; } };
        await callOmnisend(nango as never, 'POST', '/images/upload', {
            body: { file: Buffer.from('image-bytes').toString('base64'), name: 'test.png' }
        });
        const form = calls[0].data as FormData;
        expect(form).toBeInstanceOf(FormData);
        expect(form.get('name')).toBe('test.png');
        expect(form.get('file')).toBeInstanceOf(Blob);
    });

    it('does not start delete tracking after an incomplete cursor page', async () => {
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
        expect(events).toEqual(['start', 'save']);
        expect(events).not.toContain('end');
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
            expect(events).not.toContain('end');
            if (mode === 'repeated') {
                expect(events).toEqual(['start', 'save', 'save']);
            } else {
                expect(events[0]).toBe('start');
                expect(events.filter((event) => event === 'end')).toHaveLength(0);
            }
        }
    });

    it('rejects malformed offset continuations before delete tracking starts', async () => {
        for (const [next, expectedError] of [
            ['/api/products?limit=100', 'invalid next offset'],
            ['/api/products?limit=100&offset=0', 'repeated offset']
        ] as const) {
            const events: string[] = [];
            const nango = {
                proxy: async () => ({ data: { products: [{ id: 'p1' }], paging: { next } } }),
                trackDeletesStart: async () => { events.push('start'); },
                batchSave: async () => { events.push('save'); },
                trackDeletesEnd: async () => { events.push('end'); }
            };

            await expect(runCollectionSync(nango as never, {
                method: 'GET', path: '/products', model: 'OmnisendProduct', collectionKey: 'products', idField: 'id', pagination: 'offset'
            })).rejects.toThrow(expectedError);
            expect(events).toEqual(['start', 'save']);
            expect(events).not.toContain('end');
        }
    });
});
