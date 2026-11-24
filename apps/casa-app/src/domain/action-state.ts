export type ActionId = 'irrigacao' | 'agua' | 'racao' | 'rele';
export type ActionState = 'idle' | 'running' | 'done' | 'error';
export type ActionStates = Record<ActionId, ActionState>;

export type ActionStateEvent =
  | { type: 'started'; actionId: ActionId }
  | { type: 'completed'; actionId: ActionId }
  | { type: 'failed'; actionId: ActionId };

export const initialActionStates: ActionStates = {
  irrigacao: 'idle',
  agua: 'idle',
  racao: 'idle',
  rele: 'idle',
};

export function actionStatesReducer(
  state: ActionStates,
  event: ActionStateEvent,
): ActionStates {
  const nextState: ActionState =
    event.type === 'started' ? 'running' : event.type === 'completed' ? 'done' : 'error';

  return {
    ...state,
    [event.actionId]: nextState,
  };
}
