import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-leads.js';

describe('instantly add-leads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-leads',
        Model: 'ActionOutput_instantly_addleads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
