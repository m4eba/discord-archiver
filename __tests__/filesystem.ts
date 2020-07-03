import fs from 'fs';
import path from 'path';
import os from 'os';

import { FileSystem } from '../src/FileSystem';

async function genFiles(channel: string): Promise<string> {
  let root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'disc'));
  const out = path.join(root, channel);
  await fs.promises.mkdir(path.join(out, '2019'), { recursive: true });
  await fs.promises.mkdir(path.join(out, '2019', '01'));
  await fs.promises.writeFile(
    path.join(out, '2019', '01', '20190104.json'),
    JSON.stringify(
      [
        {
          id: '1',
          timestamp: '20190104',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.writeFile(
    path.join(out, '2019', '01', '20190105.json'),
    JSON.stringify(
      [
        {
          id: '2',
          timestamp: '20190105',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.mkdir(path.join(out, '2019', '02'));
  await fs.promises.writeFile(
    path.join(out, '2019', '02', '20190202.json'),
    JSON.stringify(
      [
        {
          id: '3',
          timestamp: '201902023',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.writeFile(
    path.join(out, '2019', '02', '20190204.json'),
    JSON.stringify(
      [
        {
          id: '4',
          timestamp: '20190204',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.mkdir(path.join(out, '2019', '10'));
  await fs.promises.writeFile(
    path.join(out, '2019', '10', '20191004.json'),
    JSON.stringify(
      [
        {
          id: '5',
          timestamp: '20191004',
        },
      ],
      null,
      ' '
    )
  );

  await fs.promises.mkdir(path.join(out, '2020'));
  await fs.promises.mkdir(path.join(out, '2020', '01'));
  await fs.promises.writeFile(
    path.join(out, '2020', '01', '20200104.json'),
    JSON.stringify(
      [
        {
          id: '6',
          timestamp: '20200104',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.writeFile(
    path.join(out, '2020', '01', '20200105.json'),
    JSON.stringify(
      [
        {
          id: '7',
          timestamp: '20200105',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.mkdir(path.join(out, '2020', '02'));
  await fs.promises.writeFile(
    path.join(out, '2020', '02', '20200204.json'),
    JSON.stringify(
      [
        {
          id: '8',
          timestamp: '20200204',
        },
      ],
      null,
      ' '
    )
  );
  await fs.promises.writeFile(
    path.join(out, '2020', '02', '20200214.json'),
    JSON.stringify(
      [
        {
          id: '9',
          timestamp: '20200214',
        },
      ],
      null,
      ' '
    )
  );

  return root;
}

test('newest file', async () => {
  const out = await genFiles('t');
  const files = await FileSystem.open('t', out);
  const newest = await files.newestFile();
  expect(newest).toBe(path.join('2020', '02', '20200214.json'));
});

test('oldest file', async () => {
  const out = await genFiles('t');
  const files = await FileSystem.open('t', out);
  const newest = await files.oldestFile();
  expect(newest).toBe(path.join('2019', '01', '20190104.json'));
});
