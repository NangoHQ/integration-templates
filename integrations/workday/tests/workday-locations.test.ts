import { afterEach, vi, expect, it, describe, beforeEach } from 'vitest';
import soap from 'soap';

import createSync from '../syncs/locations.js';

describe('workday locations tests', () => {
    const models = 'Location'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'locations',
            Model: 'Location'
        });

        // Mock getConnection to return proper credentials
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

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();

        // Get expected output to build mock response
        const expectedBatchSaveData = await nangoMock.getBatchSaveData('Location');

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_LocationsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Total_Results: expectedBatchSaveData.length,
                        Total_Pages: 1,
                        Page_Results: expectedBatchSaveData.length,
                        Page: 1
                    },
                    Response_Data: {
                        Location: expectedBatchSaveData.map((record: any) => ({
                            Location_Reference: {
                                ID: [
                                    {
                                        attributes: { 'wd:type': 'WID' },
                                        $value: `wid-${record.id}`
                                    },
                                    {
                                        attributes: { 'wd:type': 'Location_ID' },
                                        $value: record.id
                                    }
                                ]
                            },
                            Location_Data: {
                                Location_Name: record.name,
                                Inactive: record.inactive ? '1' : '0',
                                ...(record.location_type && {
                                    Location_Type_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Location_Type_ID' },
                                                $value: record.location_type
                                            }
                                        ]
                                    }
                                }),
                                ...(record.time_zone && {
                                    Time_Profile_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Time_Profile_ID' },
                                                $value: record.time_zone
                                            }
                                        ]
                                    }
                                }),
                                ...(record.usage && {
                                    Usage_Data: [
                                        {
                                            Location_Usage_Reference: {
                                                ID: [
                                                    {
                                                        attributes: { 'wd:type': 'Location_Usage_ID' },
                                                        $value: record.usage
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }),
                                ...(record.last_updated && {
                                    Last_Updated_DateTime: record.last_updated
                                })
                            }
                        }))
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        // Mock WSSecurity as a constructor function
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {} as any;
        } as any);

        await createSync.exec(nangoMock);

        for (const model of models) {
            const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

            const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
                if (call[1] === model) {
                    return call[0];
                }

                return [];
            });

            // Normalize spy-captured args into plain JSON so they compare cleanly
            // with fixture data loaded from `*.test.json`.
            // Removes things like prototypes, undefined values and other non-serializable data.
            const spied = JSON.parse(JSON.stringify(spiedData));

            expect(spied).toStrictEqual(expectedBatchSaveData);
        }
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        // Get expected output to build mock response
        const expectedBatchSaveData = await nangoMock.getBatchSaveData('Location');

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_LocationsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Total_Results: expectedBatchSaveData.length,
                        Total_Pages: 1,
                        Page_Results: expectedBatchSaveData.length,
                        Page: 1
                    },
                    Response_Data: {
                        Location: expectedBatchSaveData.map((record: any) => ({
                            Location_Reference: {
                                ID: [
                                    {
                                        attributes: { 'wd:type': 'WID' },
                                        $value: `wid-${record.id}`
                                    },
                                    {
                                        attributes: { 'wd:type': 'Location_ID' },
                                        $value: record.id
                                    }
                                ]
                            },
                            Location_Data: {
                                Location_Name: record.name,
                                Inactive: record.inactive ? '1' : '0',
                                ...(record.location_type && {
                                    Location_Type_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Location_Type_ID' },
                                                $value: record.location_type
                                            }
                                        ]
                                    }
                                }),
                                ...(record.time_zone && {
                                    Time_Profile_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Time_Profile_ID' },
                                                $value: record.time_zone
                                            }
                                        ]
                                    }
                                }),
                                ...(record.usage && {
                                    Usage_Data: [
                                        {
                                            Location_Usage_Reference: {
                                                ID: [
                                                    {
                                                        attributes: { 'wd:type': 'Location_Usage_ID' },
                                                        $value: record.usage
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }),
                                ...(record.last_updated && {
                                    Last_Updated_DateTime: record.last_updated
                                })
                            }
                        }))
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        // Mock WSSecurity as a constructor function
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {} as any;
        } as any);

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
