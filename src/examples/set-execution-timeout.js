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

// ======= 👨‍💻👩‍💻 Client script =======
try {
  await context.eval(
    `
    while(true) {
        log('tik');
        log('toc');
    }
`,
    {
      timeout: 1,
    }
  );
} catch (error) {
  console.log('Error when script exhausted timeout', error);
} finally {
  console.log('Client script stopped because it exhausted timeout');
}
