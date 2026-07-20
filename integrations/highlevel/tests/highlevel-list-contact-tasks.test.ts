import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contact-tasks.js';

describe('highlevel list-contact-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contact-tasks',
        Model: 'ActionOutput_highlevel_listcontacttasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
