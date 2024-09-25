import { vi, expect, it, describe } from 'vitest';

import fetchData from '../syncs/event-invitees.js';

let batchSaveData: any = null;

describe('calendly event-invitees tests', () => {
    const nangoMock = new global.vitest.NangoSyncMock({ dirname: __dirname, name: 'event-invitees', Model: 'EventInvitee' });

    it('should get, map correctly the data and batchSave the result', async () => {
        await fetchData(nangoMock);

        const batchSaveData = await nangoMock.getBatchSaveData();
        expect(nangoMock.batchSave).toHaveBeenCalledWith(batchSaveData, 'EventInvitee');
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const batchDeleteData = await nangoMock.getBatchDeleteData();
        await fetchData(nangoMock);

        if (batchDeleteData && batchDeleteData.length > 0) {
            expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, 'EventInvitee');
        }
    });
});
