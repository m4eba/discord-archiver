import fs from 'fs';
import path from 'path';

export interface Config {
  token: string;
  bot: boolean;
  channel: Array<string>;
  guild: string;
  exclude: Array<string>;
  history: boolean;
  historyUntil: string;
}

export const defaultConfig: Config = {
  token: '',
  bot: false,
  channel: [],
  guild: '',
  exclude: [],
  history: true,
  historyUntil: '',
};

export async function load(out: string): Promise<Config> {
  const filename = path.join(out, 'config.json');
  console.log('load config file from', filename);
  const content = await fs.promises.readFile(filename, { encoding: 'utf8' });
  const config: Config = JSON.parse(content);
  // TODO test properties
  return { ...defaultConfig, ...config };
}
