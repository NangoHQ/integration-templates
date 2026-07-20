import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-suppression-groups.js';

describe('sendgrid list-suppression-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-suppression-groups',
        Model: 'ActionOutput_sendgrid_listsuppressiongroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
