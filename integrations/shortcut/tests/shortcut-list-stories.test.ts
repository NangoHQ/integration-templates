import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-stories.js';

describe('shortcut list-stories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-stories',
        Model: 'ActionOutput_shortcut_liststories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
