import { Client } from "https://deno.land/x/twi@1.2.2/mod.ts";
import { z } from "https://deno.land/x/zod@v3.20.2/mod.ts";

const token = z.string().parse(Deno.env.get("TOKEN"));
const user = z.string().parse(Deno.args[0]);

const file = await Deno.open(`${user}.txt`, { write: true, create: true });

function write(string: string) {
  return file.write(new TextEncoder().encode(JSON.stringify(string) + "\n"));
}

const client = new Client(token);

const searches = client.tweets.tweetsRecentSearch({
  query: `from:${user} lang:ckb -is:retweet -has:links`,
});

let collected = 0;

try {
  for await (const search of searches) {
    const tweets = search.data ?? [];

    for (const tweet of tweets) {
      await write(tweet.text);

      collected++;
      console.log(collected);
    }
  }
} catch (err) {
  console.error(err);
}
