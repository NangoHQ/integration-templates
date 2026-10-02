import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unsubscribe-contact.js';

describe('lemlist unsubscribe-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unsubscribe-contact',
        Model: 'ActionOutput_lemlist_unsubscribecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
