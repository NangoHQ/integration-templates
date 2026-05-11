import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-record-by-external-id.js';

describe('salesforce update-record-by-external-id tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-record-by-external-id',
        Model: 'ActionOutput_salesforce_updaterecordbyexternalid'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
