// The Unleash Toolbar attaches its instance to `window` on mount; declare it so the
// console escape hatch (`window.unleashToolbar.show()`) is typed.
declare global {
  interface Window {
    unleashToolbar?: import('@unleash/toolbar').UnleashToolbarInstance;
  }
}

export {};
