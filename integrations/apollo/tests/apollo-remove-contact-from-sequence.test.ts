import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-contact-from-sequence.js';

describe('apollo remove-contact-from-sequence tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-contact-from-sequence',
        Model: 'ActionOutput_apollo_oauth_removecontactfromsequence'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
