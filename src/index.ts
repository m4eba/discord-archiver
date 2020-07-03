import Archiver from './Archiver';

if (process.argv.length === 2) {
  console.log('output dir required');
}
const out = process.argv[2];

(async () => {
  const archiver = new Archiver(out);
  await archiver.start();
})();
