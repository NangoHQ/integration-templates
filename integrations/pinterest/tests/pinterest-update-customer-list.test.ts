import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-list.js';

describe('pinterest update-customer-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer-list',
        Model: 'ActionOutput_pinterest_updatecustomerlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
