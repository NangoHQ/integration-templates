import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer-list.js';

describe('pinterest get-customer-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-customer-list',
        Model: 'ActionOutput_pinterest_getcustomerlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
