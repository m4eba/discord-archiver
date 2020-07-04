import fetch from 'node-fetch';
import Debug from 'debug';
import { Config } from './Config';

const debug = Debug('API');

export async function request(config: Config, path: string): Promise<any> {
  const url = `https://discordapp.com/api/v6/${path}`;
  debug('request %s', url);
  let headers = {
    Authorization: config.token,
  };
  if (config.bot === true) {
    headers.Authorization = `Bot ${config.token}`;
  }
  const resp = await fetch(url, {
    headers: headers,
  });
  const obj = await resp.json();
  if (obj.code && obj.message) {
    //error
    throw new Error(obj.message);
  }
  return obj;
}
