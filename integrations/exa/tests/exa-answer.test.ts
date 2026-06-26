import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/answer.js';

describe('exa answer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'answer',
        Model: 'ActionOutput_exa_answer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
