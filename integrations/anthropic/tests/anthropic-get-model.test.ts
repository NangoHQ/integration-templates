import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-model.js';

describe('anthropic get-model tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-model',
        Model: 'ActionOutput_anthropic_getmodel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
