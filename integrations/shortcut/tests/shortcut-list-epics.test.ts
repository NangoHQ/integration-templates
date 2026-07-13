import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-epics.js';

describe('shortcut list-epics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-epics',
        Model: 'ActionOutput_shortcut_listepics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
