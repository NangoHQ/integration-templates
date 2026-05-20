import { afterEach, beforeEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/positions.js';

const mockSoapClient = {
    addHttpHeader: vi.fn(),
    setSecurity: vi.fn(),
    setEndpoint: vi.fn(),
    Get_PositionsAsync: vi.fn().mockResolvedValue([{ Response_Results: { Total_Pages: 1, Page: 1 }, Response_Data: { Position: [] } }, ''])
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

describe('workday positions tests', () => {
    const models = 'Position'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'positions',
            Model: 'Position'
        });

        // @ts-expect-error - mocking getConnection for SOAP client
        nangoMock.getConnection = vi.fn(async () => ({
            credentials: { type: 'BASIC', username: 'test@tenant', password: 'test123' },
            connection_config: { hostname: 'test.workday.com', tenant: 'test' }
        }));

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    beforeEach(() => {
        mockSoapClient.Get_PositionsAsync.mockReset();
        mockSoapClient.Get_PositionsAsync.mockResolvedValue([
            { Response_Results: { Total_Pages: 1, Page: 1 }, Response_Data: { Position: [] } },
            ''
        ]);
    });

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
