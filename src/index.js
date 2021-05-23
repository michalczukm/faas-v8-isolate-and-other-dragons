import fetch from 'node-fetch';
import ivm from 'isolated-vm';
import { provideConsole } from './provide-console.js';
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
const script = await isolate.compileScript(`log('hello!')`); // From 📦:  hello!
script.run(context).catch(console.error);

await provideConsole({ isolate, context, jail });
await context.eval(`console.log('yey!');`); // From 📦:  yey!

// modify base JS objects
await context.eval(`Object.prototype.secret = '🤫';`);
await context.eval(`console.log('secret:', Object.secret);`); // From 📦:  🤫

// run code from sandbox
{
  const script = await isolate.compileScript(`
    global.bootstrap = (createdAt, config) => {
        global.createdAt = createdAt;
        global.getConfig = () => config;

        delete global.bootstrap;
    }
  `);
  script.run(context);

  const bootstrapRef = await jail.get('bootstrap');
  await bootstrapRef.apply(null, [new Date(), { client: 'michalczukm' }]);

  // ======= 👨‍💻👩‍💻 Client script =======
  await context.eval(
    'console.log(`ƛ started at ${createdAt}!`, JSON.stringify(getConfig()))'
  ); // From 📦:  ƛ started at Sun May 23 2021 19:27:00 GMT+0200 (Central European Summer Time)! {"client":"michalczukm"}
}

// create second context
{
  const context = await isolate.createContext();

  const jail = context.global;
  await jail.set('global', jail.derefInto());
  await context.eval(`console.log('secret:', Object.secret);`); // ... no result, since we even don't have console.log there ;)

  await provideConsole({ isolate, context, jail });
  await context.eval(`console.log('secret:', Object.secret);`); // From 📦:  secret: undefined
}

// add fetch to context
// allow only fetch from relative URL - which will be dispatched in our implementation
{
  const context = await isolate.createContext();

  const jail = context.global;
  await jail.set('global', jail.derefInto());
  await provideConsole({ isolate, context, jail });

  const script = await isolate.compileScript(`
      global.bootstrap = (fetch) => {
        global.fetch = async (...args) => {
            const result = await fetch.applySync(undefined, args, { arguments: { copy: true }, result: { promise: true } });
            // since *result* is returned as reference we have to get its value with *derefInto*
            return result.derefInto();
        };

        delete global.bootstrap;
      }
    `);
  script.run(context);

  // super naive example, but the idea is - you can create top level fetch function
  // and add some dispatching on your side. Plus - encapsulate authorization.
  const dispatchByUrl = (url) => {
    switch (/^.*\/(.*?)\//.exec(url)?.[1]) {
      case 'fruit':
        return fetch('https://www.fruityvice.com/api' + url);
      case 'movies':
        return fetch('http://example.com/service' + url, {
          headers: {
            Authorize: '<Secret token>',
          },
        });
      default:
        throw new Error('😢 not supported');
    }
  };

  const callback = (url) => dispatchByUrl(url).then((r) => r.json());

  const bootstrapRef = await jail.get('bootstrap', { reference: true });
  await bootstrapRef.apply(null, [callback], {
    arguments: { reference: true },
    result: { reference: true },
  });

  // ======= 👨‍💻👩‍💻 Client script =======
  await context.eval(
    `
    const run = async () => {
        const data = await fetch('/fruit/banana');
        console.log('response: ', data);
    }

    run();
    `,
    { reference: true, promise: true }
  );
}
