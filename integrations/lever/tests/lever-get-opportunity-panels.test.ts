import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-opportunity-panels.js';

describe('lever-basic get-opportunity-panels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-opportunity-panels',
        Model: 'ActionOutput_lever_basic_getopportunitypanels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
