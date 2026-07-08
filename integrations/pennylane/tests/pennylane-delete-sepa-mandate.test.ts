import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sepa-mandate.js';

describe('pennylane delete-sepa-mandate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sepa-mandate',
        Model: 'ActionOutput_pennylane_deletesepamandate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
