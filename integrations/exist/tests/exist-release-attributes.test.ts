import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/release-attributes.js';

describe('exist release-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'release-attributes',
        Model: 'ActionOutput_exist_releaseattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
