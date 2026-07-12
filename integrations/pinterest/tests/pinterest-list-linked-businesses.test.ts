import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-linked-businesses.js';

describe('pinterest list-linked-businesses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-linked-businesses',
        Model: 'ActionOutput_pinterest_listlinkedbusinesses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
