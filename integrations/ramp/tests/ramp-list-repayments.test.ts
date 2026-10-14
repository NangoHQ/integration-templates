import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-repayments.js';

describe('ramp list-repayments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-repayments',
        Model: 'ActionOutput_ramp_listrepayments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
