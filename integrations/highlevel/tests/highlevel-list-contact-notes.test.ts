import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contact-notes.js';

describe('highlevel list-contact-notes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contact-notes',
        Model: 'ActionOutput_highlevel_listcontactnotes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
