import { Config, load, defaultConfig } from './Config';
import Channel from './Channel';
import { FileSystem } from './FileSystem';
import { request } from './Api';

interface ApiChannel {
  id: string;
  type: number;
}
export class Archiver {
  private out: string;
  private config: Config = defaultConfig;

  constructor(out: string) {
    this.out = out;
  }

  public async start() {
    this.config = await load(this.out);

    let channels = this.config.channel;
    if (this.config.guild.length > 0) {
      channels = await this.guild(this.config.guild);
    }
    console.log('channels', channels);
    for (let i = 0; i < channels.length; ++i) {
      let c = channels[i];
      console.log('processing channel', c);
      const fsys = await FileSystem.open(c, this.out);
      const channel = new Channel(this.out, c, fsys, this.config);
      try {
        await channel.start();
      } catch (e) {
        console.log('error while processing channel', e.toString());
      }
      await fsys.flush();
    }
  }

  private async guild(id: string): Promise<Array<string>> {
    const obj = await request(this.config, `/guilds/${id}/channels`);
    const channels = obj as Array<ApiChannel>;
    let result: Array<string> = [];
    channels.forEach((c) => {
      if (c.type != 0) return;
      if (this.config.exclude.indexOf(c.id) > -1) return;
      result.push(c.id);
    });
    return result;
  }
}

export default Archiver;
