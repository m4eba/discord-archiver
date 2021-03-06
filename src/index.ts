import Archiver from './Archiver';

if (process.argv.length === 2) {
  console.log('output dir required');
  process.exit(1);
}
const out = process.argv[2];

(async () => {
  const archiver = new Archiver(out);
  await archiver.start();
})();
