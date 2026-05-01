import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-comment.js';

describe('jira add-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-comment',
        Model: 'ActionOutput_jira_addcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
