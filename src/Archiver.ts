import { Config, load, defaultConfig } from './Config';
import Channel from './Channel';
import { FileSystem } from './FileSystem';

export class Archiver {
  private out: string;
  private config: Config = defaultConfig;

  constructor(out: string) {
    this.out = out;
  }

  public async start() {
    this.config = await load(this.out);

    for (let i = 0; i < this.config.channel.length; ++i) {
      let c = this.config.channel[i];
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
}

export default Archiver;
