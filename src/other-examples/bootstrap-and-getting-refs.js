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

// To do some bigger preparations, it is worth to prepare bootstrap function
// which requires OUR params to be settled.
// Those params tend to be some configuration, some data we fetch from our systems to seed the lambda.
const script = await isolate.compileScript(`
    global.bootstrap = (createdAt, config) => {
        global.createdAt = createdAt;
        global.getConfig = () => config;

        delete global.bootstrap;
    }
`);
script.run(context);

// get reference for object defined on context global
const bootstrapRef = await jail.get('bootstrap');
// call this function, to provide all data
await bootstrapRef.apply(null, [new Date(), { client: 'michalczukm' }]);

// now client code can use data we injected ;)
await context.eval(
  'log(`ƛ started at ${createdAt}!`, JSON.stringify(getConfig()))'
); // From 📦:  ƛ started at Sun May 23 2021 19:27:00 GMT+0200 (Central European Summer Time)! {"client":"michalczukm"}
