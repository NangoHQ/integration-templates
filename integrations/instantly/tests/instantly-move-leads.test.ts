import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-leads.js';

describe('instantly move-leads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-leads',
        Model: 'ActionOutput_instantly_moveleads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
