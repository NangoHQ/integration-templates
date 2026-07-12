import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sepa-mandate.js';

describe('pennylane create-sepa-mandate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sepa-mandate',
        Model: 'ActionOutput_pennylane_createsepamandate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
