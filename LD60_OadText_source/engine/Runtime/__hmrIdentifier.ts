/**
 * A number that changes whenever a module got hot module replaced. Useful to
 * declare as dependency for react hook
 */
export let hmrIdentifier = 0;

import.meta.hot?.on('vite:afterUpdate', () => hmrIdentifier++);
