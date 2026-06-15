import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order.js';

describe('acuity-scheduling get-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order',
        Model: 'ActionOutput_acuity_scheduling_getorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
