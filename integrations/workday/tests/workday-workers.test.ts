import { afterEach, vi, expect, it, describe, beforeEach } from 'vitest';

import createSync from '../syncs/workers.js';
import soap from 'soap';

describe('workday workers tests', () => {
    const models = 'Worker'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'workers',
            Model: 'Worker'
        });

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();

        // Mock connection data
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@test_tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        });

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_WorkersAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Page: 1,
                        Total_Pages: 1,
                        Total_Results: 1
                    },
                    Response_Data: {
                        Worker: [
                            {
                                Worker_Reference: {
                                    ID: [
                                        { attributes: { 'wd:type': 'WID' }, $value: 'wid123' },
                                        { attributes: { 'wd:type': 'Employee_ID' }, $value: 'EMP001' }
                                    ]
                                },
                                Worker_Data: {
                                    Active: '1',
                                    User_ID: 'user001',
                                    Personal_Data: {
                                        Name_Data: {
                                            First_Name: 'John',
                                            Last_Name: 'Doe'
                                        },
                                        Contact_Data: {
                                            Email_Address_Data: [{ Email_Address: 'john.doe@example.com' }],
                                            Phone_Data: [{ Phone_Number: '555-1234' }]
                                        }
                                    },
                                    Employment_Data: {
                                        Worker_Job_Data: [
                                            {
                                                Hire_Date: '2020-01-15',
                                                Business_Title: 'Software Engineer',
                                                Job_Profile_Data: [
                                                    {
                                                        Job_Title: 'Senior Software Engineer',
                                                        Job_Profile_Reference: {
                                                            ID: [
                                                                {
                                                                    attributes: { 'wd:type': 'Job_Profile_ID' },
                                                                    $value: 'JOB001'
                                                                }
                                                            ]
                                                        }
                                                    }
                                                ],
                                                Position_Data: {
                                                    Position_Reference: {
                                                        ID: [
                                                            {
                                                                attributes: { 'wd:type': 'Position_ID' },
                                                                $value: 'POS001'
                                                            }
                                                        ]
                                                    }
                                                },
                                                Manager_Reference: {
                                                    ID: [
                                                        {
                                                            attributes: { 'wd:type': 'Employee_ID' },
                                                            $value: 'MGR001'
                                                        }
                                                    ]
                                                },
                                                Business_Site_Summary_Data: {
                                                    Location_Reference: {
                                                        ID: [
                                                            {
                                                                attributes: { 'wd:type': 'Location_ID' },
                                                                $value: 'LOC001'
                                                            }
                                                        ]
                                                    }
                                                },
                                                Company_Summary_Data: {
                                                    Company_Reference: {
                                                        ID: [
                                                            {
                                                                attributes: { 'wd:type': 'Company_Reference_ID' },
                                                                $value: 'COMP001'
                                                            }
                                                        ]
                                                    }
                                                },
                                                Cost_Center_Summary_Data: {
                                                    Cost_Center_Reference: {
                                                        ID: [
                                                            {
                                                                attributes: { 'wd:type': 'Cost_Center_Reference_ID' },
                                                                $value: 'CC001'
                                                            }
                                                        ]
                                                    }
                                                },
                                                Department_Summary_Data: {
                                                    Department_Reference: {
                                                        ID: [
                                                            {
                                                                attributes: { 'wd:type': 'Organization_Reference_ID' },
                                                                $value: 'DEPT001'
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    Worker_Type_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Worker_Type_ID' },
                                                $value: 'Employee'
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {} as any;
        });

        await createSync.exec(nangoMock);

        // Verify batchSave was called with the expected data
        expect(batchSaveSpy).toHaveBeenCalled();
        const savedData = batchSaveSpy.mock.calls[0][0];
        expect(savedData).toHaveLength(1);
        expect(savedData[0].id).toBe('EMP001');
        expect(savedData[0].first_name).toBe('John');
        expect(savedData[0].last_name).toBe('Doe');
        expect(savedData[0].email).toBe('john.doe@example.com');
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        // Mock connection data
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@test_tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        });

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_WorkersAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Page: 1,
                        Total_Pages: 1,
                        Total_Results: 0
                    },
                    Response_Data: {
                        Worker: []
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {} as any;
        });

        await createSync.exec(nangoMock);

        for (const model of models) {
            const batchDeleteData = await nangoMock.getBatchDeleteData(model);
            if (batchDeleteData && batchDeleteData.length > 0) {
                const spiedData = batchDeleteSpy.mock.calls.flatMap((call) => {
                    if (call[1] === model) {
                        return call[0];
                    }

                    return [];
                });

                // Normalize spy-captured args into plain JSON so they compare cleanly
                // with fixture data loaded from `*.test.json`.
                // Removes things like prototypes, undefined values and other non-serializable data.
                const spied = JSON.parse(JSON.stringify(spiedData));

                expect(spied).toStrictEqual(batchDeleteData);
            }
        }
    });
});
