/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import type { NangoSync } from '../../models';

interface AsanaUser {
    gid: string;
    name: string;
    email: string;
    photo?: {
        image_128x128: string;
    };
}

interface AsanaTask {
    gid: string;
    name: string;
    resource_type: string;
    completed: boolean;
    due_on: string | null;
    permalink_url: string;
    notes: string;
    created_at: string;
    modified_at: string;
    assignee: AsanaUser | null;
}

interface BaseAsanaModel {
    gid: string;
    name: string;
    resource_type: string;
}

interface Task {
    id: string;
    url: string;
    status: string;
    title: string;
    description: string | null;
    due_date: string | null;
    assignee: {
        id: string;
        email: string | null;
        name: string;
        avatar_url: string | null;
        created_at: string | null;
        modified_at: string | null;
    } | null;
    created_at: string;
    modified_at: string;
}

class MockNango {
    private savedTasks: Task[] = [];
    private currentEndpoint: string = '';
    private workspaceCount: number = 0;
    private projectCount: number = 0;
    private taskCount: number = 0;

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;
        console.log('Paginating endpoint:', config.endpoint);

        if (config.endpoint === '/api/1.0/workspaces') {
            console.log('Processing workspaces, count:', this.workspaceCount);
            // Verify workspace pagination configuration
            expect(config.params.limit).toBe(100);
            expect(config.retries).toBe(10);

            if (this.workspaceCount === 0) {
                this.workspaceCount++;
                yield [
                    {
                        gid: 'workspace_1',
                        name: 'Test Workspace',
                        resource_type: 'workspace'
                    } as unknown as T
                ];
            }
            yield [];
        } else if (config.endpoint === '/api/1.0/projects') {
            console.log('Processing projects, count:', this.projectCount);
            // Verify project pagination configuration
            expect(config.params.workspace).toBe('workspace_1');
            expect(config.params.limit).toBe(100);
            expect(config.retries).toBe(10);

            if (this.projectCount === 0) {
                this.projectCount++;
                yield [
                    {
                        gid: 'project_1',
                        name: 'Test Project',
                        resource_type: 'project'
                    } as unknown as T
                ];
            }
            yield [];
        } else if (config.endpoint === '/api/1.0/tasks') {
            console.log('Processing tasks, count:', this.taskCount);
            // Verify task pagination configuration
            expect(config.params.project).toBe('project_1');
            expect(config.params.limit).toBe('100');
            expect(config.params.opt_fields).toContain('name');
            expect(config.params.opt_fields).toContain('assignee.name');
            expect(config.retries).toBe(10);

            if (this.taskCount === 0) {
                // First page of tasks
                const mockTask1: AsanaTask = {
                    gid: 'task_1',
                    name: 'Test Task 1',
                    resource_type: 'task',
                    completed: false,
                    due_on: '2024-03-26',
                    permalink_url: 'https://app.asana.com/task/1',
                    notes: 'Task description',
                    created_at: '2024-03-25T10:00:00.000Z',
                    modified_at: '2024-03-25T11:00:00.000Z',
                    assignee: {
                        gid: 'user_1',
                        name: 'John Doe',
                        email: 'john@example.com',
                        photo: {
                            image_128x128: 'https://example.com/photo.jpg'
                        }
                    }
                };

                const mockTask2: AsanaTask = {
                    gid: 'task_2',
                    name: 'Test Task 2',
                    resource_type: 'task',
                    completed: true,
                    due_on: null,
                    permalink_url: 'https://app.asana.com/task/2',
                    notes: 'Another task',
                    created_at: '2024-03-25T12:00:00.000Z',
                    modified_at: '2024-03-25T13:00:00.000Z',
                    assignee: null
                };

                this.taskCount++;
                yield [mockTask1, mockTask2] as unknown as T[];
            }
            yield [];
        }
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'Task' && records.length > 0) {
            console.log('Saving tasks:', records);
            this.savedTasks = [...this.savedTasks, ...(records as Task[])];
            console.log('Current saved tasks:', this.savedTasks);
        }
    }

    getSavedTasks(): Task[] {
        return this.savedTasks;
    }

    getCurrentEndpoint(): string {
        return this.currentEndpoint;
    }
}

describe('Asana Tasks Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle nested pagination correctly', async () => {
        const fetchData = (await import('../syncs/tasks')).default;
        await fetchData(nango as unknown as NangoSync);

        const savedTasks = nango.getSavedTasks();
        expect(savedTasks).toHaveLength(2); // Two pages of tasks

        // Verify first task
        const firstTask = savedTasks[0];
        expect(firstTask).toBeDefined();
        if (firstTask) {
            expect(firstTask.id).toBe('task_1');
            expect(firstTask.url).toBe('https://app.asana.com/task/1');
            expect(firstTask.status).toBe('open');
            expect(firstTask.title).toBe('Test Task 1');
            expect(firstTask.description).toBe('Task description');
            expect(firstTask.due_date).toBe('2024-03-26T00:00:00.000Z');
            expect(firstTask.assignee).toEqual({
                id: 'user_1',
                email: 'john@example.com',
                name: 'John Doe',
                avatar_url: 'https://example.com/photo.jpg',
                created_at: null,
                modified_at: null
            });
            expect(firstTask.created_at).toBe('2024-03-25T10:00:00.000Z');
            expect(firstTask.modified_at).toBe('2024-03-25T11:00:00.000Z');
        }

        // Verify second task
        const secondTask = savedTasks[1];
        expect(secondTask).toBeDefined();
        if (secondTask) {
            expect(secondTask.id).toBe('task_2');
            expect(secondTask.url).toBe('https://app.asana.com/task/2');
            expect(secondTask.status).toBe('completed');
            expect(secondTask.title).toBe('Test Task 2');
            expect(secondTask.description).toBe('Another task');
            expect(secondTask.due_date).toBeNull();
            expect(secondTask.assignee).toBeNull();
            expect(secondTask.created_at).toBe('2024-03-25T12:00:00.000Z');
            expect(secondTask.modified_at).toBe('2024-03-25T13:00:00.000Z');
        }
    });

    it('should handle empty responses at each level', async () => {
        nango.paginate = async function* <T>(config: any): AsyncGenerator<T[]> {
            // Return empty results for all endpoints
            yield [];
        };

        const fetchData = (await import('../syncs/tasks')).default;
        await fetchData(nango as unknown as NangoSync);

        const savedTasks = nango.getSavedTasks();
        expect(savedTasks).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/tasks')).default;
        await expect(fetchData(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
