import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sepa-mandate.js';

describe('pennylane get-sepa-mandate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sepa-mandate',
        Model: 'ActionOutput_pennylane_getsepamandate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
