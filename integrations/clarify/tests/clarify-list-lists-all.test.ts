import { expect, it, describe } from 'vitest';

import runAction from '../actions/list-lists.js';

describe('clarify list-lists (default all types) tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lists-all',
        Model: 'ListListsOutput'
    });

    it('should fetch static and dynamic lists when listType defaults to all', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
