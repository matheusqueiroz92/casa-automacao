import {
  actionStatesReducer,
  initialActionStates,
} from './action-state';

describe('actionStatesReducer', () => {
  it('marks only the selected action as running', () => {
    const result = actionStatesReducer(initialActionStates, {
      type: 'started',
      actionId: 'agua',
    });

    expect(result).not.toBe(initialActionStates);
    expect(result).toEqual({
      irrigacao: 'idle',
      agua: 'running',
      racao: 'idle',
    });
  });

  it('marks a running action as done', () => {
    const running = actionStatesReducer(initialActionStates, {
      type: 'started',
      actionId: 'racao',
    });

    expect(
      actionStatesReducer(running, { type: 'completed', actionId: 'racao' }),
    ).toEqual({
      irrigacao: 'idle',
      agua: 'idle',
      racao: 'done',
    });
  });

  it('marks a failed publication for retry', () => {
    expect(
      actionStatesReducer(initialActionStates, {
        type: 'failed',
        actionId: 'irrigacao',
      }).irrigacao,
    ).toBe('error');
  });
});
