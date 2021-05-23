const runStringified = (fn) => `(${fn.toString()})();`;

export const provideConsole = async ({ isolate, context, jail }) => {
  await jail.set('_log', (...args) => console.log('From 📦: ', ...args));

  const script = await isolate.compileScript(
    runStringified(() => {
      const console = Object.freeze({
        log: global._log,
      });
      Object.defineProperty(global, 'console', {
        value: console,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      delete global._log;
    }),
    {
      filename: 'file://console.js',
    }
  );

  script.run(context).catch(console.error);
};
