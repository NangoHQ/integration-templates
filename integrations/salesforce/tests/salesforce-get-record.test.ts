import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-record.js';

describe('salesforce get-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-record',
        Model: 'ActionOutput_salesforce_getrecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
