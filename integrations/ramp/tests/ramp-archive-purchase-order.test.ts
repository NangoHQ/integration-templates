import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-purchase-order.js';

describe('ramp archive-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'archive-purchase-order',
        Model: 'ActionOutput_ramp_archivepurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
