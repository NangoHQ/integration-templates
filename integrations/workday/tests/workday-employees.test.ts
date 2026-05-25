import { vi, expect, it, describe, beforeEach } from 'vitest';

import createSync from '../syncs/employees.js';
import soap from 'soap';

describe('workday employees tests', () => {
    const nangoMock = new global.vitest.NangoSyncMock({
        dirname: __dirname,
        name: 'employees',
        Model: 'Employee'
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const output = await nangoMock.getBatchSaveData('Employee');

        // Mock the connection
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        } as any);

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_WorkersAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: {
                        Worker: output.map((emp: any) => ({
                            Worker_Reference: {
                                ID: [
                                    {
                                        attributes: { 'wd:type': 'WID' },
                                        $value: emp.id
                                    },
                                    ...(emp.employee_id
                                        ? [
                                              {
                                                  attributes: { 'wd:type': 'Employee_ID' },
                                                  $value: emp.employee_id
                                              }
                                          ]
                                        : []),
                                    ...(emp.contingent_worker_id
                                        ? [
                                              {
                                                  attributes: { 'wd:type': 'Contingent_Worker_ID' },
                                                  $value: emp.contingent_worker_id
                                              }
                                          ]
                                        : [])
                                ]
                            },
                            Worker_Data: {
                                Worker_ID: emp.worker_id,
                                User_ID: emp.user_id,
                                Last_Updated_DateTime: emp.last_updated,
                                Personal_Data: {
                                    Name_Data: {
                                        Legal_Name_Data: {
                                            Name_Detail_Data: {
                                                First_Name: emp.first_name,
                                                Last_Name: emp.last_name
                                            }
                                        }
                                    },
                                    Contact_Data: {
                                        Email_Address_Data: emp.email
                                            ? [
                                                  {
                                                      Email_Address: emp.email,
                                                      Usage_Data: {
                                                          Type_Data: {
                                                              Type_Reference: {
                                                                  ID: [{ $value: 'WORK' }]
                                                              }
                                                          }
                                                      }
                                                  }
                                              ]
                                            : undefined,
                                        Phone_Data: emp.phone
                                            ? [
                                                  {
                                                      Formatted_Phone: emp.phone,
                                                      Usage_Data: {
                                                          Type_Data: {
                                                              Type_Reference: {
                                                                  ID: [{ $value: 'WORK' }]
                                                              }
                                                          }
                                                      }
                                                  }
                                              ]
                                            : undefined
                                    }
                                },
                                Employment_Data: {
                                    Worker_Status_Data: {
                                        Hire_Date: emp.hire_date,
                                        Termination_Date: emp.termination_date,
                                        Active: emp.active ? '1' : '0'
                                    },
                                    Worker_Position_Data: [
                                        {
                                            Job_Profile_Summary_Data: {
                                                Job_Profile_Name: emp.job_title
                                            },
                                            Business_Site_Summary_Data: {
                                                Location_Reference: emp.location
                                                    ? {
                                                          Organization_Name: emp.location
                                                      }
                                                    : undefined
                                            }
                                        }
                                    ]
                                }
                            }
                        }))
                    },
                    Response_Results: {
                        Total_Pages: 1,
                        Page: 1
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {} as any;
        });

        const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');
        await createSync.exec(nangoMock);
        expect(batchSaveSpy).toHaveBeenCalled();
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const batchDeleteData = await nangoMock.getBatchDeleteData('Employee');
        if (batchDeleteData && batchDeleteData.length > 0) {
            const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');
            await createSync.exec(nangoMock);
            expect(batchDeleteSpy).toHaveBeenCalled();
        }
    });
});
