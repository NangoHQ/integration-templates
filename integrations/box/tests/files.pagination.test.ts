import type { ProxyConfiguration } from 'nango';
import { describe, expect, test } from 'vitest';
import type { BoxEntryItem, ListFolderItemsResponse } from '../types.js';
import type { BoxDocument } from '../models.js';
import fetchData from '../syncs/files.js';

function makeEntry(id: string): BoxEntryItem {
    return {
        id,
        name: `file${id}.txt`,
        type: 'file',
        content_created_at: '2024-01-01T00:00:00Z',
        content_modified_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: '2024-01-01T00:00:00Z',
        sequence_id: id,
        sha1: `sha-${id}`,
        etag: id,
        shared_link: {
            download_url: `https://box.com/file${id}.txt`
        }
    } as BoxEntryItem;
}

function makePage(entry: BoxEntryItem | undefined, nextMarker: string | null, offset: number): ListFolderItemsResponse {
    return {
        entries: entry ? [entry] : [],
        limit: 1,
        next_marker: nextMarker ?? '',
        offset,
        order: [{ by: 'name', direction: 'ASC' }],
        prev_marker: '',
        total_count: entry ? 1 : 0
    };
}

describe('Box Files Pagination', () => {
    test('handles checkpointed marker pagination correctly', async () => {
        const savedDocuments: BoxDocument[] = [];
        const pages = new Map<string, ListFolderItemsResponse>([
            ['', makePage(makeEntry('1'), 'page2', 0)],
            ['page2', makePage(makeEntry('2'), 'page3', 1)],
            ['page3', makePage(makeEntry('3'), null, 2)]
        ]);
        const requests: ProxyConfiguration[] = [];

        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['folder1']
        });
        mockNango.get.mockImplementation((config: ProxyConfiguration) => {
            requests.push(config);
            const marker = String(config.params?.['marker'] ?? '');
            return Promise.resolve({ data: pages.get(marker) });
        });
        mockNango.batchSave.mockImplementation((docs: BoxDocument[]) => {
            savedDocuments.push(...docs);
            return Promise.resolve();
        });

        await fetchData.exec(mockNango);

        expect(requests).toHaveLength(3);
        expect(requests.map((request) => request.params?.['marker'])).toEqual([undefined, 'page2', 'page3']);
        expect(requests[0]).toMatchObject({
            endpoint: '/2.0/folders/folder1/items',
            params: {
                fields: 'id,name,modified_at,shared_link',
                usemarker: 'true',
                limit: '1000'
            }
        });
        expect(savedDocuments.map((document) => document.id)).toEqual(['1', '2', '3']);
        expect(mockNango.saveCheckpoint).toHaveBeenCalledTimes(3);
        expect(mockNango.saveCheckpoint).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ currentFolderId: 'folder1', folderMarker: 'page2' })
        );
        expect(mockNango.saveCheckpoint).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ currentFolderId: 'folder1', folderMarker: 'page3' })
        );
        expect(mockNango.clearCheckpoint).toHaveBeenCalledOnce();
        expect(mockNango.trackDeletesStart).toHaveBeenCalledWith('BoxDocument');
        expect(mockNango.trackDeletesEnd).toHaveBeenCalledWith('BoxDocument');
        expect(mockNango.clearCheckpoint.mock.invocationCallOrder[0]).toBeLessThan(mockNango.trackDeletesEnd.mock.invocationCallOrder[0]!);
    });

    test('handles an empty page correctly', async () => {
        const savedDocuments: BoxDocument[] = [];
        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['empty-folder']
        });
        mockNango.get.mockResolvedValue({ data: makePage(undefined, null, 0) });
        mockNango.batchSave.mockImplementation((docs: BoxDocument[]) => {
            savedDocuments.push(...docs);
            return Promise.resolve();
        });

        await fetchData.exec(mockNango);

        expect(savedDocuments).toHaveLength(0);
        expect(mockNango.saveCheckpoint).toHaveBeenCalledWith(
            expect.objectContaining({ folderQueue: '', currentFolderId: '', folderMarker: '' })
        );
        expect(mockNango.clearCheckpoint).toHaveBeenCalledOnce();
    });

    test('propagates a pagination request error', async () => {
        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['error-folder']
        });
        mockNango.get.mockRejectedValue(new Error('Pagination failed'));

        await expect(fetchData.exec(mockNango)).rejects.toThrow('Pagination failed');
        expect(mockNango.batchSave).not.toHaveBeenCalled();
        expect(mockNango.clearCheckpoint).not.toHaveBeenCalled();
        expect(mockNango.trackDeletesEnd).not.toHaveBeenCalled();
    });
});
