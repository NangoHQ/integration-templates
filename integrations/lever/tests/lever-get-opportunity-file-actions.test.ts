import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-opportunity-file-actions.js';

describe('lever-basic get-opportunity-file-actions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-opportunity-file-actions',
        Model: 'ActionOutput_lever_basic_getopportunityfileactions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
