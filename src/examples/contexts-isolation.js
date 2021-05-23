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

await jail.set('log', (...args) => console.log('From 📦: ', ...args));

// modify base JS objects
await context.eval(`Object.prototype.secret = '🤫';`);
await context.eval(`log('secret:', Object.secret);`); // From 📦:  🤫

// create second context
// this context is separate one. No operations we did on previous one
// have influence on this
{
  const secondContext = await isolate.createContext();

  const jail = secondContext.global;
  await jail.set('global', jail.derefInto());

  // it throws "ReferenceError: log is not defined"
  // since log is not defined on this contexts
  //await context.eval(`log('secret:', Object.secret);`); // ...

  // set log
  await jail.set('log', (...args) => console.log('From 📦: ', ...args));

  // first context modification has no impact here
  await secondContext.eval(`log('secret:', Object.secret);`); // From 📦:  secret: undefined
}
