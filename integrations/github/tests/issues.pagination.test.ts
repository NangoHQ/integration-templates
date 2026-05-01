import { NangoSync } from "nango";
/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';

interface GitHubIssue {
    id: number;
    node_id: string;
    number: number;
    title: string;
    state: string;
    user: { id: number; login: string };
    body: string;
    created_at: string;
    updated_at: string;
    html_url: string;
    repository_url: string;
    url: string;
    labels_url: string;
    comments_url: string;
    events_url: string;
    pull_request?: { url: string };
}

interface Issue {
    id: string;
    node_id: string;
    number: number;
    state: 'open' | 'closed';
    state_reason?: string;
    title: string;
    body?: string;
    html_url: string;
    repository_url: string;
    user_id?: number;
    user_login?: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
}

class MockNango {
    private savedIssues: Issue[] = [];
    private checkpoint: unknown = null;
    private repoCount: number = 0;
    private issueCount: number = 0;
    private logMessages: string[] = [];

    async getCheckpoint(): Promise<unknown> {
        return this.checkpoint;
    }

    async saveCheckpoint(data: unknown): Promise<void> {
        this.checkpoint = data;
    }

    async getConnection(): Promise<{ metadata: unknown }> {
        return { metadata: {} };
    }

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        if (config.endpoint === '/installation/repositories') {
            if (this.repoCount === 0) {
                this.repoCount++;
                yield [
                    { name: 'repo1', owner: { login: 'testuser' } },
                    { name: 'repo2', owner: { login: 'testuser' } }
                ] as unknown as T[];
            }
            yield [] as T[];
        } else if (config.endpoint.match(/\/repos\/.*\/issues/)) {
            expect(config.paginate.limit).toBe(100);

            if (this.issueCount === 0) {
                const mockIssue1: GitHubIssue = {
                    id: 1001,
                    node_id: 'node_1001',
                    number: 1,
                    title: 'First Issue',
                    state: 'open',
                    user: { id: 201, login: 'contributor1' },
                    body: 'Issue description',
                    created_at: '2024-03-25T10:00:00Z',
                    updated_at: '2024-03-25T11:00:00Z',
                    html_url: 'https://github.com/testuser/repo1/issues/1',
                    repository_url: 'https://api.github.com/repos/testuser/repo1',
                    url: 'https://api.github.com/repos/testuser/repo1/issues/1',
                    labels_url: '',
                    comments_url: '',
                    events_url: ''
                };

                const mockPR: GitHubIssue = {
                    id: 1002,
                    node_id: 'node_1002',
                    number: 2,
                    title: 'Test PR',
                    state: 'open',
                    user: { id: 202, login: 'contributor2' },
                    body: 'PR description',
                    created_at: '2024-03-25T12:00:00Z',
                    updated_at: '2024-03-25T13:00:00Z',
                    html_url: 'https://github.com/testuser/repo1/pull/2',
                    repository_url: 'https://api.github.com/repos/testuser/repo1',
                    url: 'https://api.github.com/repos/testuser/repo1/pulls/2',
                    labels_url: '',
                    comments_url: '',
                    events_url: '',
                    pull_request: { url: 'https://api.github.com/repos/testuser/repo1/pulls/2' }
                };

                const mockIssue2: GitHubIssue = {
                    id: 1003,
                    node_id: 'node_1003',
                    number: 3,
                    title: 'Second Issue',
                    state: 'closed',
                    user: { id: 203, login: 'contributor3' },
                    body: 'Another issue',
                    created_at: '2024-03-25T14:00:00Z',
                    updated_at: '2024-03-25T15:00:00Z',
                    html_url: 'https://github.com/testuser/repo1/issues/3',
                    repository_url: 'https://api.github.com/repos/testuser/repo1',
                    url: 'https://api.github.com/repos/testuser/repo1/issues/3',
                    labels_url: '',
                    comments_url: '',
                    events_url: ''
                };

                this.issueCount++;
                yield [mockIssue1, mockPR, mockIssue2] as unknown as T[];
            }
            yield [] as T[];
        }
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'Issue' && records.length > 0) {
            this.savedIssues = [...this.savedIssues, ...(records as Issue[])];
        }
    }

    async log(message: string): Promise<void> {
        this.logMessages.push(message);
    }

    getSavedIssues(): Issue[] {
        return this.savedIssues;
    }

    getLogMessages(): string[] {
        return this.logMessages;
    }

    async deleteRecordsFromPreviousExecutions(model: string): Promise<void> {}
}

describe('GitHub Issues Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle nested pagination and filter out PRs', async () => {
        const fetchData = (await import('../syncs/issues')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedIssues = nango.getSavedIssues();
        expect(savedIssues).toHaveLength(2); // Two issues (PR filtered out)

        const firstIssue = savedIssues[0];
        expect(firstIssue).toBeDefined();
        if (firstIssue) {
            expect(firstIssue.id).toBe('1001');
            expect(firstIssue.number).toBe(1);
            expect(firstIssue.title).toBe('First Issue');
            expect(firstIssue.state).toBe('open');
            expect(firstIssue.user_login).toBe('contributor1');
            expect(firstIssue.user_id).toBe(201);
            expect(firstIssue.body).toBe('Issue description');
            expect(firstIssue.created_at).toBe('2024-03-25T10:00:00Z');
            expect(firstIssue.updated_at).toBe('2024-03-25T11:00:00Z');
        }

        const secondIssue = savedIssues[1];
        expect(secondIssue).toBeDefined();
        if (secondIssue) {
            expect(secondIssue.id).toBe('1003');
            expect(secondIssue.number).toBe(3);
            expect(secondIssue.title).toBe('Second Issue');
            expect(secondIssue.state).toBe('closed');
            expect(secondIssue.user_login).toBe('contributor3');
            expect(secondIssue.user_id).toBe(203);
            expect(secondIssue.body).toBe('Another issue');
            expect(secondIssue.created_at).toBe('2024-03-25T14:00:00Z');
            expect(secondIssue.updated_at).toBe('2024-03-25T15:00:00Z');
        }
    });

    it('should handle empty responses at each level', async () => {
        nango.paginate = async function* <T>(_config: any): AsyncGenerator<T[]> {
            yield [] as T[];
        };

        const fetchData = (await import('../syncs/issues')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedIssues = nango.getSavedIssues();
        expect(savedIssues).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/issues')).default;
        await expect(fetchData.exec(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
