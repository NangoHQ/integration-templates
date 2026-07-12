import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-quote-status.js';

describe('pennylane update-quote-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-quote-status',
        Model: 'ActionOutput_pennylane_updatequotestatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
