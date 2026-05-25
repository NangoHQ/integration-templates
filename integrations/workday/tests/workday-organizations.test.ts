import { afterEach, beforeEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/organizations.js';
import expectedData from './organizations.test.json';

// Helper to generate SOAP response from expected mapped data
function generateSoapResponse(organizations: any[]) {
    return {
        Response_Results: {
            Total_Results: organizations.length,
            Total_Pages: 1,
            Page_Results: organizations.length,
            Page: 1
        },
        Response_Data: {
            Organization: organizations.map((org) => ({
                Organization_Reference: {
                    ID: [
                        {
                            attributes: { 'wd:type': 'Organization_Reference_ID' },
                            $value: org.id
                        },
                        {
                            attributes: { 'wd:type': 'WID' },
                            $value: `wid-${org.id}`
                        }
                    ]
                },
                Organization_Data: {
                    Name: org.name,
                    Reference_ID: org.reference_id,
                    Inactive: org.inactive ? '1' : '0',
                    Last_Updated_DateTime: org.last_updated,
                    ...(org.type && {
                        Organization_Type_Reference: {
                            ID: {
                                attributes: { 'wd:type': 'Organization_Type_ID' },
                                $value: org.type
                            }
                        }
                    }),
                    ...(org.subtype && {
                        Organization_Subtype_Reference: {
                            ID: {
                                attributes: { 'wd:type': 'Organization_Subtype_ID' },
                                $value: org.subtype
                            }
                        }
                    })
                }
            }))
        }
    };
}

// Mock the soap module
const mockSoapClient = {
    addHttpHeader: vi.fn(),
    setSecurity: vi.fn(),
    setEndpoint: vi.fn(),
    Get_OrganizationsAsync: vi.fn()
};

vi.mock('soap', () => {
    class MockWSSecurity {}
    return {
        default: {
            createClientAsync: vi.fn(() => Promise.resolve(mockSoapClient)),
            WSSecurity: MockWSSecurity,
            Client: class {}
        }
    };
});

describe('workday organizations tests', () => {
    const models = 'Organization'.split(',');

    beforeEach(() => {
        // Reset mock
        mockSoapClient.Get_OrganizationsAsync.mockReset();

        // Setup mock to return the expected organizations
        const expectedOrgs = expectedData.nango.batchSave.Organization;
        const soapResponse = generateSoapResponse(expectedOrgs);
        mockSoapClient.Get_OrganizationsAsync.mockResolvedValue([soapResponse, '']);
    });

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'organizations',
            Model: 'Organization'
        });

        // @ts-expect-error - mocking getConnection for SOAP client
        nangoMock.getConnection = vi.fn(async () => ({
            credentials: {
                type: 'BASIC',
                username: 'test@tenant',
                password: 'test123'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test'
            }
        }));

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
