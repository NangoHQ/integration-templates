import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-person.js';

describe('pipelinecrm get-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-person',
        Model: 'ActionOutput_pipelinecrm_getperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
