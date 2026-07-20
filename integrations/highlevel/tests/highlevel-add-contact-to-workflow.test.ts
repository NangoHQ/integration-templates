import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-contact-to-workflow.js';

describe('highlevel add-contact-to-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-contact-to-workflow',
        Model: 'ActionOutput_highlevel_addcontacttoworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
