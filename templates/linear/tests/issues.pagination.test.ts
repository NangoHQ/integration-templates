import { NangoSync, ProxyConfiguration } from "nango";
/// <reference types="vitest" />
import type { AxiosResponse } from 'axios';
import type { z } from 'zod';
import { linearIssueSchema } from '../schema.zod';
import fetchData from '../syncs/issues.js';
import { describe, test, expect, vi, beforeEach } from 'vitest';

type LinearIssue = z.infer<typeof linearIssueSchema>;

class MockNango {
    post: any;
    batchSave: any;
    lastSyncDate: Date | null;

    constructor() {
        this.post = vi.fn();
        this.batchSave = vi.fn();
        this.lastSyncDate = null;
    }
}

describe('Linear Issues Pagination', () => {
    let nango: NangoSync;
    let savedIssues: LinearIssue[] = [];

    beforeEach(() => {
        nango = new MockNango() as unknown as NangoSync;
        savedIssues = [];

        vi.spyOn(nango, 'post').mockImplementation(async (config: ProxyConfiguration): Promise<AxiosResponse> => {
            const query = (config.data as { query: string }).query;

            // Mock different responses based on the presence of 'after' in the query
            if (!query.includes('after:')) {
                return {
                    data: {
                        data: {
                            issues: {
                                nodes: [
                                    {
                                        id: 'issue123',
                                        title: 'Test Issue',
                                        description: 'Test description',
                                        state: {
                                            id: 'state123',
                                            name: 'Todo',
                                            description: 'To do state'
                                        },
                                        dueDate: '2024-01-01T00:00:00.000Z',
                                        estimate: null,
                                        createdAt: '2024-01-01T00:00:00.000Z',
                                        updatedAt: '2024-01-01T00:00:00.000Z',
                                        assignee: null,
                                        creator: null,
                                        project: null,
                                        team: {
                                            id: 'team123'
                                        }
                                    }
                                ],
                                pageInfo: {
                                    hasNextPage: true,
                                    endCursor: 'cursor123'
                                }
                            }
                        }
                    },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any
                };
            } else {
                return {
                    data: {
                        data: {
                            issues: {
                                nodes: [],
                                pageInfo: {
                                    hasNextPage: false,
                                    endCursor: null
                                }
                            }
                        }
                    },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any
                };
            }
        });

        vi.spyOn(nango, 'batchSave').mockImplementation(async <T extends object>(results: T[], model: string): Promise<boolean> => {
            console.log('batchSave called with:', JSON.stringify(results, null, 2));
            console.log('model:', model);
            if (results.length > 0) {
                savedIssues = [...savedIssues, ...(results as LinearIssue[])];
            }
            return true;
        });
    });

    test('should configure GraphQL cursor-based pagination correctly', async () => {
        await fetchData(nango);

        const postCalls = vi.mocked(nango.post).mock.calls;
        expect(postCalls).toHaveLength(2);

        // Verify first call without cursor
        const firstCall = postCalls[0]?.[0] as ProxyConfiguration;
        expect(firstCall.endpoint).toBe('/graphql');
        expect((firstCall.data as { query: string }).query).toContain('first: 50');
        expect((firstCall.data as { query: string }).query).not.toContain('after:');

        // Verify second call with cursor
        const secondCall = postCalls[1]?.[0] as ProxyConfiguration;
        expect((secondCall.data as { query: string }).query).toContain('after: "cursor123"');

        // Log the state before assertions
        console.log('savedIssues before assertions:', JSON.stringify(savedIssues, null, 2));

        // Verify mapped data
        expect(savedIssues).toHaveLength(1);
        expect(savedIssues[0]).toEqual({
            id: 'issue123',
            title: 'Test Issue',
            description: 'Test description',
            status: 'Todo',
            dueDate: '2024-01-01T00:00:00.000Z',
            estimate: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            assigneeId: null,
            creatorId: null,
            projectId: null,
            teamId: 'team123'
        });
    });

    test('should handle incremental sync with lastSyncDate', async () => {
        const lastSyncDate = new Date('2024-01-01');
        nango.lastSyncDate = lastSyncDate;

        await fetchData(nango);

        const postCalls = vi.mocked(nango.post).mock.calls;
        const firstCall = postCalls[0]?.[0] as ProxyConfiguration;
        expect((firstCall.data as { query: string }).query).toContain(`updatedAt: { gte: "${lastSyncDate.toISOString()}" }`);
    });

    test('should handle empty pages', async () => {
        vi.spyOn(nango, 'post').mockImplementation(
            async (): Promise<AxiosResponse> => ({
                data: {
                    data: {
                        issues: {
                            nodes: [],
                            pageInfo: {
                                hasNextPage: false,
                                endCursor: null
                            }
                        }
                    }
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            })
        );

        await fetchData(nango);

        expect(savedIssues).toHaveLength(0);
        expect(nango.post).toHaveBeenCalledTimes(1);
    });

    test('should handle pagination errors', async () => {
        vi.spyOn(nango, 'post').mockImplementation(async () => {
            throw new Error('GraphQL query failed');
        });

        await expect(fetchData(nango)).rejects.toThrow('GraphQL query failed');
    });
});
