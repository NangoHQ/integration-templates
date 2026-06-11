import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-organizations.js';

describe('trello list-organizations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-organizations',
        Model: 'ActionOutput_trello_listorganizations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
