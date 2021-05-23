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
await jail.set('log', (...args) => console.log('From 📦: ', ...args));

// Allow only fetch from relative URL - which will be dispatched in our implementation
// Here you have **super naive** example, but the idea is - you can create top level fetch function
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

// add fetch to context an
await context.evalClosure(
  `global.fetch = async (...args) => {
        const result = await $0.applySync(undefined, args, { arguments: { copy: true }, result: { promise: true } });
        // since *result* is returned as reference we have to get its value with *derefInto*
        return result.derefInto();
    }`,
  [callback],
  { arguments: { reference: true } }
);

// ======= 👨‍💻👩‍💻 Client script =======
await context.eval(
  `
    const run = async () => {
        const data = await fetch('/fruit/banana');
        log('response: ', data);
    }

    run();
    `,
  { reference: true, promise: true }
);
