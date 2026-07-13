import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-epic-comment.js';

describe('shortcut create-epic-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-epic-comment',
        Model: 'ActionOutput_shortcut_createepiccomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
