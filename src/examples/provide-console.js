/**
 * No import module allowed out of the box.
 * Also - no Node globals available
 */
import fs from 'fs';
import ivm from 'isolated-vm';
const { Isolate } = ivm;

// create new Isolate
const isolate = new Isolate({
  inspector: true,
  memoryLimit: 128, // in MB
});

const context = await isolate.createContext();

const jail = context.global;

await jail.set('global', jail.derefInto());
await jail.set('_log', (...args) => console.log('From 📦: ', ...args));

// Now we'd like to prepare some objects in Isolate context.
// f.e. bring node console object
// we have to create it
// since we cannot bring object into context (only via reference)
// we can provide each fn. separately and then combine those inside context
const script = await isolate.compileScript(
  `const console = Object.freeze({
        log: global._log,
    });
    Object.defineProperty(global, 'console', {
        value: console,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    delete global._log;`
);

script.run(context);

const script = await isolate.compileScript(`console.log('hello 👋')`);
script.run(context);


// now console is available on global
context.evalSync(`console.log('Alive!!!')`);