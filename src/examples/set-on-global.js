import fetch from 'node-fetch';
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

// ====== Primitives =========
// 👍 This one sets log on isolate context
await jail.set('log', (...args) => console.log('From 📦: ', ...args));
// 👍 Setting primitives also works
await jail.set('CONST_NAME', (() => 'Application name')());

const script = await isolate.compileScript(`log(CONST_NAME)`); // From 📦:  Application name
script.run(context).catch(console.error);

// ====== Objects =========
try {
  // DON'T DO THIS, at least use IFFE (below is for simplification)
  // 👎 Object is not transferable, so we cannot pass it
  await jail.set('config', (() => ({
    baseUrl: 'https://example.com',
    permissions: {
      users: false,
      services: true,
    },
  }))());

  const script = await isolate.compileScript(`log(config)`); // From 📦:  Application name
  script.run(context).catch(console.error);
} catch (error) {
  console.log('👎 Object is not transferable, so we cannot pass it', error);
}

{
  // 👍 Object is not transferable, but we can mark it to be passed via reference
  await jail.set(
    'config',
    new ivm.Reference({
      baseUrl: 'https://example.com',
      permissions: {
        users: false,
        services: true,
      },
    })
  );

  // to get reference value - we have to use `deref`
  await context.eval(`log(config.derefInto())`); // From 📦:  Application name
}
