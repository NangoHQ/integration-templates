import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-person.js';

describe('pipelinecrm create-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-person',
        Model: 'ActionOutput_pipelinecrm_createperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
