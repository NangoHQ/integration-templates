import { expect, it, describe } from 'vitest';

import runAction from '../actions/list-lists.js';

describe('clarify list-lists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lists',
        Model: 'ListListsOutput'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
