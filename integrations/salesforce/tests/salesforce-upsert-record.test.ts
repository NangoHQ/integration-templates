import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-record.js';

describe('salesforce upsert-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-record',
        Model: 'ActionOutput_salesforce_upsertrecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
