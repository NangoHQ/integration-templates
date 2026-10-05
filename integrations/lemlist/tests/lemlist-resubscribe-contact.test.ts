import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resubscribe-contact.js';

describe('lemlist resubscribe-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resubscribe-contact',
        Model: 'ActionOutput_lemlist_resubscribecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
