import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-todos.js';

describe('basecamp list-todos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-todos',
        Model: 'ActionOutput_basecamp_listtodos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should omit email_address when the provider returns it as null for creator/assignees', async () => {
        const nullEmailMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'list-todos-null-email',
            Model: 'ActionOutput_basecamp_listtodos'
        });

        const input = await nullEmailMock.getInput();
        const response = await createAction.exec(nullEmailMock, input);
        const output = await nullEmailMock.getOutput();

        expect(response).toEqual(output);
    });
});
