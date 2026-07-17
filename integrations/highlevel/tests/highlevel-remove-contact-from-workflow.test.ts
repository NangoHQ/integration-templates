import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-contact-from-workflow.js';

describe('highlevel remove-contact-from-workflow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-contact-from-workflow',
        Model: 'ActionOutput_highlevel_removecontactfromworkflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
