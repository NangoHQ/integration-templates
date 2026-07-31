import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-rock.js';

describe('ninety-io delete-rock tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-rock',
        Model: 'ActionOutput_ninety_io_deleterock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
