import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-order.js';

describe('bigcommerce create-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-order',
        Model: 'ActionOutput_bigcommerce_createorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
