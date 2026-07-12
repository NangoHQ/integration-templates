import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-purchase-requests.js';

describe('pennylane list-purchase-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-purchase-requests',
        Model: 'ActionOutput_pennylane_listpurchaserequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
