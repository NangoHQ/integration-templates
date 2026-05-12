import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/tag-conversation.js';

describe('intercom tag-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'tag-conversation',
        Model: 'ActionOutput_intercom_tagconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
