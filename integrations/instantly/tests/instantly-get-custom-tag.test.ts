import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-custom-tag.js';

describe('instantly get-custom-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-custom-tag',
        Model: 'ActionOutput_instantly_getcustomtag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
