import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-quote-changes.js';

describe('pennylane list-quote-changes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-quote-changes',
        Model: 'ActionOutput_pennylane_listquotechanges'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
