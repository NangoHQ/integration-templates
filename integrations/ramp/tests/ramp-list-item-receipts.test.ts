import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-item-receipts.js';

describe('ramp list-item-receipts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-item-receipts',
        Model: 'ActionOutput_ramp_listitemreceipts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
