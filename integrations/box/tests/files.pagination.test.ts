import { ProxyConfiguration } from "nango";
import { describe, expect, test } from 'vitest';
import type { BoxEntryItem, ListFolderItemsResponse } from '../types.js';
import type { BoxDocument } from '../.nango/schema.js';
import fetchData from '../syncs/files.js';

interface Pagination {
    type: string;
    limit?: number;
    response_path?: string;
    limit_name_in_request: string;
    in_body?: boolean;
}

interface CursorPagination extends Pagination {
    type: 'cursor';
    cursor_path_in_response: string;
    cursor_name_in_request: string;
}

interface BoxProxyConfig extends ProxyConfiguration {
    paginate: {
        type: 'cursor';
        cursor_path_in_response: string;
        limit_name_in_request: string;
        cursor_name_in_request: string;
        response_path: string;
        limit: number;
    };
}

describe('Box Files Pagination', () => {
    test('handles cursor-based pagination configuration correctly', async () => {
        const savedDocuments: BoxDocument[] = [];

        // Mock three pages of folder contents
        const page1: ListFolderItemsResponse = {
            entries: [
                {
                    id: '1',
                    name: 'file1.txt',
                    type: 'file',
                    content_created_at: '2024-01-01T00:00:00Z',
                    content_modified_at: '2024-01-01T00:00:00Z',
                    created_at: '2024-01-01T00:00:00Z',
                    modified_at: '2024-01-01T00:00:00Z',
                    sequence_id: '1',
                    sha1: 'abc123',
                    etag: '1',
                    shared_link: {
                        download_url: 'https://box.com/file1.txt'
                    }
                } as BoxEntryItem
            ],
            limit: 1,
            next_marker: 'page2',
            offset: 0,
            order: [{ by: 'name', direction: 'ASC' }],
            prev_marker: '',
            total_count: 3
        };

        const page2: ListFolderItemsResponse = {
            entries: [
                {
                    id: '2',
                    name: 'file2.txt',
                    type: 'file',
                    content_created_at: '2024-01-01T00:00:00Z',
                    content_modified_at: '2024-01-01T00:00:00Z',
                    created_at: '2024-01-01T00:00:00Z',
                    modified_at: '2024-01-01T00:00:00Z',
                    sequence_id: '2',
                    sha1: 'def456',
                    etag: '2',
                    shared_link: {
                        download_url: 'https://box.com/file2.txt'
                    }
                } as BoxEntryItem
            ],
            limit: 1,
            next_marker: 'page3',
            offset: 1,
            order: [{ by: 'name', direction: 'ASC' }],
            prev_marker: 'page1',
            total_count: 3
        };

        const page3: ListFolderItemsResponse = {
            entries: [
                {
                    id: '3',
                    name: 'file3.txt',
                    type: 'file',
                    content_created_at: '2024-01-01T00:00:00Z',
                    content_modified_at: '2024-01-01T00:00:00Z',
                    created_at: '2024-01-01T00:00:00Z',
                    modified_at: '2024-01-01T00:00:00Z',
                    sequence_id: '3',
                    sha1: 'ghi789',
                    etag: '3',
                    shared_link: {
                        download_url: 'https://box.com/file3.txt'
                    }
                } as BoxEntryItem
            ],
            limit: 1,
            next_marker: '',
            offset: 2,
            order: [{ by: 'name', direction: 'ASC' }],
            prev_marker: 'page2',
            total_count: 3
        };

        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        // Mock metadata to include a folder
        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['folder1']
        });

        // Track pagination configuration
        let paginationConfig: BoxProxyConfig | null = null;

        // Mock paginate to verify configuration and return pages
        mockNango.paginate.mockImplementation(async function* (config: BoxProxyConfig) {
            // Capture the pagination configuration on first call
            if (!paginationConfig) {
                paginationConfig = config;
            }

            yield [page1.entries[0], page2.entries[0], page3.entries[0]];
        });

        mockNango.get.mockImplementation((config: ProxyConfiguration) => {
            if (config.endpoint.includes('folders')) {
                return Promise.resolve({
                    data: {
                        entries: [page1.entries[0], page2.entries[0], page3.entries[0]]
                    }
                });
            }
            return Promise.resolve({ data: page1.entries[0] });
        });

        mockNango.batchSave.mockImplementation((docs: BoxDocument[]) => {
            savedDocuments.push(...docs);
            return Promise.resolve();
        });

        await fetchData.exec(mockNango);

        // Verify pagination configuration
        expect(paginationConfig).toBeDefined();
        expect(paginationConfig?.paginate).toEqual({
            type: 'cursor',
            cursor_path_in_response: 'next_marker',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'marker',
            response_path: 'entries',
            limit: 100
        });

        // Verify all documents were saved
        expect(savedDocuments).toHaveLength(3);
        expect(savedDocuments[0]?.id).toBe('1');
        expect(savedDocuments[0]?.download_url).toBe('https://box.com/file1.txt');
        expect(savedDocuments[1]?.id).toBe('2');
        expect(savedDocuments[1]?.download_url).toBe('https://box.com/file2.txt');
        expect(savedDocuments[2]?.id).toBe('3');
        expect(savedDocuments[2]?.download_url).toBe('https://box.com/file3.txt');
    });

    test('handles empty page correctly', async () => {
        const savedDocuments: BoxDocument[] = [];
        const emptyPage: ListFolderItemsResponse = {
            entries: [],
            limit: 1,
            next_marker: '',
            offset: 0,
            order: [{ by: 'name', direction: 'ASC' }],
            prev_marker: '',
            total_count: 0
        };

        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        // Mock metadata with a folder but return empty results
        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['empty-folder']
        });

        mockNango.paginate.mockImplementation(async function* () {
            yield [];
        });

        mockNango.get.mockImplementation((config: ProxyConfiguration) => {
            return Promise.resolve({ data: { entries: [] } });
        });

        mockNango.batchSave.mockImplementation((docs: BoxDocument[]) => {
            savedDocuments.push(...docs);
            return Promise.resolve();
        });

        await fetchData.exec(mockNango);

        expect(savedDocuments).toHaveLength(0);
    });

    test('handles pagination error gracefully', async () => {
        const savedDocuments: BoxDocument[] = [];
        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'files',
            Model: 'BoxDocument'
        });

        mockNango.getMetadata.mockResolvedValue({
            files: [],
            folders: ['error-folder']
        });

        mockNango.get.mockImplementation((config: ProxyConfiguration) => {
            return Promise.resolve({ data: { entries: [] } });
        });

        mockNango.paginate.mockImplementation(async function* () {
            throw new Error('Pagination failed');
        });

        mockNango.batchSave.mockImplementation((docs: BoxDocument[]) => {
            savedDocuments.push(...docs);
            return Promise.resolve();
        });

        await expect(fetchData.exec(mockNango)).rejects.toThrow('Pagination failed');
        expect(savedDocuments).toHaveLength(0);
    });
});
