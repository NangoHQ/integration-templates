import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-iterations.js';

describe('shortcut list-iterations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-iterations',
        Model: 'ActionOutput_shortcut_listiterations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
