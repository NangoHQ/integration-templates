import { NangoSync } from "nango";
/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';

interface GithubRepoFile {
    id: string;
    name: string;
    url: string;
    last_modified_date: Date;
}

interface TreeItem {
    path: string;
    type: string;
    sha: string;
    url: string;
}

interface CommitFile {
    filename: string;
    status: string;
    sha: string;
    blob_url: string;
    committer?: {
        date: string;
    };
}

interface CommitSummary {
    sha: string;
    commit: {
        committer: {
            date: string;
        };
    };
}

class MockNango {
    private savedFiles: GithubRepoFile[] = [];
    private deletedFiles: GithubRepoFile[] = [];
    private currentEndpoint: string = '';
    public lastSyncDate: Date | null = null;
    private metadata = {
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main'
    };

    async getMetadata<T>(): Promise<T> {
        return this.metadata as unknown as T;
    }

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;

        if (config.endpoint === '/repos/test-owner/test-repo/git/trees/main') {
            // Initial sync - Git Trees API
            expect(config.params.recursive).toBe('1');
            expect(config.paginate.response_path).toBe('tree');
            expect(config.paginate.limit).toBe(100);

            const mockFiles: TreeItem[] = [
                {
                    path: 'src/index.ts',
                    type: 'blob',
                    sha: 'file1_sha',
                    url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/file1_sha'
                },
                {
                    path: 'src/utils',
                    type: 'tree',
                    sha: 'dir_sha',
                    url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/dir_sha'
                },
                {
                    path: 'src/utils/helper.ts',
                    type: 'blob',
                    sha: 'file2_sha',
                    url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/file2_sha'
                }
            ];

            yield mockFiles as unknown as T[];
            yield [];
        } else if (config.endpoint === '/repos/test-owner/test-repo/commits') {
            // Incremental sync - List commits
            expect(config.params.since).toBeDefined();
            expect(config.paginate.limit).toBe(100);

            const mockCommits: CommitSummary[] = [
                {
                    sha: 'commit1_sha',
                    commit: {
                        committer: {
                            date: '2024-03-26T12:00:00Z'
                        }
                    }
                }
            ];

            yield mockCommits as unknown as T[];
            yield [];
        } else if (config.endpoint === '/repos/test-owner/test-repo/commits/commit1_sha') {
            // Incremental sync - Get commit details
            expect(config.paginate.response_path).toBe('files');
            expect(config.paginate.limit).toBe(100);

            const mockCommitFiles: CommitFile[] = [
                {
                    filename: 'src/index.ts',
                    status: 'modified',
                    sha: 'file1_sha_new',
                    blob_url: 'https://github.com/test-owner/test-repo/blob/commit1_sha/src/index.ts',
                    committer: {
                        date: '2024-03-26T12:00:00Z'
                    }
                },
                {
                    filename: 'src/utils/helper.ts',
                    status: 'removed',
                    sha: 'file2_sha',
                    blob_url: 'https://github.com/test-owner/test-repo/blob/commit1_sha/src/utils/helper.ts',
                    committer: {
                        date: '2024-03-26T12:00:00Z'
                    }
                }
            ];

            yield mockCommitFiles as unknown as T[];
            yield [];
        }
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'GithubRepoFile' && records.length > 0) {
            this.savedFiles = [...this.savedFiles, ...(records as GithubRepoFile[])];
        }
    }

    async batchDelete<T>(records: T[], model: string): Promise<void> {
        if (model === 'GithubRepoFile' && records.length > 0) {
            this.deletedFiles = [...this.deletedFiles, ...(records as GithubRepoFile[])];
        }
    }

    async log(message: string): Promise<void> {
        // Mock logging
    }

    getSavedFiles(): GithubRepoFile[] {
        return this.savedFiles;
    }

    getDeletedFiles(): GithubRepoFile[] {
        return this.deletedFiles;
    }

    getCurrentEndpoint(): string {
        return this.currentEndpoint;
    }
}

describe('GitHub List Files Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle initial sync pagination correctly', async () => {
        const fetchData = (await import('../syncs/list-files')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedFiles = nango.getSavedFiles();
        expect(savedFiles).toHaveLength(2); // Only blob files should be saved

        expect(savedFiles).toEqual([
            {
                id: 'file1_sha',
                name: 'src/index.ts',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/file1_sha',
                last_modified_date: expect.any(Date)
            },
            {
                id: 'file2_sha',
                name: 'src/utils/helper.ts',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/file2_sha',
                last_modified_date: expect.any(Date)
            }
        ]);
    });

    it('should handle incremental sync pagination correctly', async () => {
        nango.lastSyncDate = new Date('2024-03-26T00:00:00Z');

        const fetchData = (await import('../syncs/list-files')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedFiles = nango.getSavedFiles();
        expect(savedFiles).toHaveLength(1); // One modified file

        expect(savedFiles[0]).toEqual({
            id: 'file1_sha_new',
            name: 'src/index.ts',
            url: 'https://github.com/test-owner/test-repo/blob/commit1_sha/src/index.ts',
            last_modified_date: new Date('2024-03-26T12:00:00Z')
        });

        const deletedFiles = nango.getDeletedFiles();
        expect(deletedFiles).toHaveLength(1); // One removed file

        expect(deletedFiles[0]).toEqual({
            id: 'file2_sha',
            name: 'src/utils/helper.ts',
            url: 'https://github.com/test-owner/test-repo/blob/commit1_sha/src/utils/helper.ts',
            last_modified_date: new Date('2024-03-26T12:00:00Z')
        });
    });

    it('should handle empty responses at each pagination level', async () => {
        nango.paginate = async function* <T>(config: any): AsyncGenerator<T[]> {
            // Return empty results for any endpoint
            yield [];
        };

        const fetchData = (await import('../syncs/list-files')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedFiles = nango.getSavedFiles();
        expect(savedFiles).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/list-files')).default;
        await expect(fetchData.exec(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
