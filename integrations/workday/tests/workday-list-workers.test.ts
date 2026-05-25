import { vi, expect, it, describe, beforeEach } from 'vitest';
import type * as soapModule from 'soap';

// Create mock response based on test data
const createMockResponse = async () => {
    const testData = await import('./list-workers.test.json');

    return {
        Response_Results: {
            Page: 1,
            Total_Pages: 1,
            Total_Results: testData.output.items.length
        },
        Response_Data: {
            Worker: testData.output.items.map((worker: any) => {
                // Build ID array based on what the worker has
                const ids: any[] = [{ attributes: { 'wd:type': 'WID' }, $value: worker.id }];
                if (worker.employee_id) {
                    ids.push({ attributes: { 'wd:type': 'Employee_ID' }, $value: worker.employee_id });
                }
                if (worker.contingent_worker_id) {
                    ids.push({ attributes: { 'wd:type': 'Contingent_Worker_ID' }, $value: worker.contingent_worker_id });
                }

                return {
                    Worker_Reference: {
                        ID: ids
                    },
                    Worker_Data: {
                        User_ID: worker.user_id,
                        Universal_ID: worker.id,
                        Worker_Descriptor: worker.name,
                        Personal_Data: {
                            Name_Data: {
                                Legal_Name_Data: {
                                    Name_Detail_Data: {
                                        Full_Name: worker.name
                                    }
                                }
                            }
                        },
                        Employment_Data: {
                            Worker_Status_Data: {
                                Hire_Date: worker.hire_date,
                                Termination_Date: worker.termination_date,
                                Active: worker.is_active ? '1' : '0'
                            },
                            Position_Data: {
                                Business_Title: worker.business_title
                            }
                        }
                    }
                };
            })
        }
    };
};

// Mock soap module before imports
vi.mock('soap', async () => {
    const mockClient = {
        addHttpHeader: vi.fn(),
        setSecurity: vi.fn(),
        setEndpoint: vi.fn(),
        Get_WorkersAsync: vi.fn()
    };

    // WSSecurity needs to be a proper constructor
    class MockWSSecurity {
        constructor() {
            // Mock WSSecurity instance
        }
    }

    // The module exports WSSecurity as a named export and default contains createClientAsync
    // But the action does: import soap from 'soap'; then soap.WSSecurity
    // So WSSecurity needs to be on the default export
    return {
        default: {
            createClientAsync: vi.fn().mockResolvedValue(mockClient),
            WSSecurity: MockWSSecurity
        }
    };
});

describe('workday list-workers tests', async () => {
    const { default: createAction } = await import('../actions/list-workers.js');
    const soap = await import('soap');

    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workers',
        Model: 'ActionOutput_workday_listworkers'
    });

    // Mock the connection for SOAP authentication
    nangoMock.getConnection = vi.fn().mockResolvedValue({
        credentials: {
            type: 'BASIC',
            username: 'test_user@tenant',
            password: 'test_password'
        },
        connection_config: {
            hostname: 'test.workday.com',
            tenant: 'test_tenant'
        }
    });

    beforeEach(async () => {
        // Reset mocks and set up the response
        const mockClient = await soap.default.createClientAsync();
        const mockResponse = await createMockResponse();
        vi.mocked(mockClient.Get_WorkersAsync).mockResolvedValue([mockResponse, '']);
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
