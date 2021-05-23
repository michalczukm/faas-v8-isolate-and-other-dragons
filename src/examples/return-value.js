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

const script = await isolate.compileScript(`
  (() => {
    const countDown = Array(10).fill().map((_,index) => index).join(',');
    return 'Counting ' + countDown;
  })();
`);
const result = await script.run(context);
console.log(result); // Counting 0,1,2,3,4,5,6,7,8,9
