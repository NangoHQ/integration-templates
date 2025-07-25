import { vi, expect, it, describe } from 'vitest';
import runAction from '../actions/list-warehouses';
import type { DatabricksWarehouseResponse } from '../types.js';

describe('databricks-workspace:list-warehouses', () => {
    const mockResponse: DatabricksWarehouseResponse = {
        warehouses: [
            {
                id: 'test-warehouse-1',
                name: 'Test Warehouse 1',
                cluster_size: 'Small',
                min_num_clusters: 1,
                max_num_clusters: 2,
                auto_stop_mins: 120,
                creator_name: 'test@example.com',
                spot_instance_policy: 'COST_OPTIMIZED',
                enable_photon: true,
                enable_serverless_compute: false,
                channel: 'CHANNEL_NAME',
                warehouse_type: 'PRO',
                num_active_sessions: 0,
                num_clusters: 1,
                state: 'RUNNING',
                tags: {
                    environment: 'test'
                },
                health: {
                    status: 'HEALTHY'
                }
            }
        ]
    };

    it('should get and map warehouses correctly', async () => {
        const nango = {
            get: vi.fn().mockResolvedValue({ data: mockResponse }),
            ActionError: Error
        };

        const result = await runAction(nango as any);

        expect(result).toEqual({
            warehouses: [mockResponse.warehouses[0]]
        });
    });

    it('should throw error when no warehouses found', async () => {
        class ActionError extends Error {
            constructor({ message }: { message: string }) {
                super(message);
                this.name = 'ActionError';
            }
        }

        const nango = {
            get: vi.fn().mockResolvedValue({ data: { warehouses: undefined } }),
            ActionError
        };

        await expect(runAction(nango as any)).rejects.toThrow('No warehouses found in response');
    });
});
