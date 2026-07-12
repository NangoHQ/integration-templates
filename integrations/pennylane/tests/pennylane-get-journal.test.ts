import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-journal.js';

describe('pennylane get-journal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-journal',
        Model: 'ActionOutput_pennylane_getjournal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
