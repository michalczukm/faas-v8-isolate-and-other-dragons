/**
 * No import module allowed out of the box.
 * Also - no Node globals available.
 * YES - this module throws EXCEPTIONS, it is expected 😉
 */
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

// 👍 We're guarded for this usage. Hovewer not the way you'd expect to 😅
// SyntaxError: Cannot use import statement outside a module [<isolated-vm>:2:5]
await context.eval(`import fs from 'fs';`);

// 👍 ReferenceError: process is not defined
await context.eval(`
  console.log(process.config);
  console.log(process.argv);
`);
