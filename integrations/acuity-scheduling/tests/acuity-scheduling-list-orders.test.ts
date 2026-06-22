import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-orders.js';

describe('acuity-scheduling list-orders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-orders',
        Model: 'ActionOutput_acuity_scheduling_listorders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
