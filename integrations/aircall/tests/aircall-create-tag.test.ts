import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-tag.js';

describe('aircall create-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-tag',
        Model: 'ActionOutput_aircall_basic_createtag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
