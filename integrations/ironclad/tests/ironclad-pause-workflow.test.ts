import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/pause-workflow.js';

describe('ironclad pause-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'pause-workflow',
        Model: 'ActionOutput_ironclad_pauseworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
