import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-todolist.js';

describe('basecamp get-todolist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-todolist',
        Model: 'ActionOutput_basecamp_gettodolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should parse a to-do-list group, which has group_position_url instead of groups_url', async () => {
        const groupMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'get-todolist-group',
            Model: 'ActionOutput_basecamp_gettodolist'
        });

        const input = await groupMock.getInput();
        const response = await createAction.exec(groupMock, input);
        const output = await groupMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should omit email_address when the provider returns it as null for the creator', async () => {
        const nullEmailMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'get-todolist-null-email',
            Model: 'ActionOutput_basecamp_gettodolist'
        });

        const input = await nullEmailMock.getInput();
        const response = await createAction.exec(nullEmailMock, input);
        const output = await nullEmailMock.getOutput();

        expect(response).toEqual(output);
    });
});
