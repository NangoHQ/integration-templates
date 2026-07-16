import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-refund.js';

describe('squareup-sandbox get-refund tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-refund',
        Model: 'ActionOutput_squareup_sandbox_getrefund'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
