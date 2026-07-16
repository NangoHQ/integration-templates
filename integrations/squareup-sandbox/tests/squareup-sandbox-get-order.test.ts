import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-order.js';

describe('squareup-sandbox get-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order',
        Model: 'ActionOutput_squareup_sandbox_getorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
