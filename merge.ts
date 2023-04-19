const files = [...Deno.readDirSync("./tweet_data/data")]
  .map((v) => `./tweet_data/data/${v.name}`);

let tweets = new Array<string>();

const BLACKLIST = Deno
  .readTextFileSync("profanity_data/data/negative_wordlist.txt")
  .split("\n");

for (const [i, file] of files.entries()) {
  try {
    tweets.push(
      ...(Deno.readTextFileSync(file)
        .split("\n")
        .map((v) => v.trim())
        .filter((v) => v)
        .map((v) => JSON.parse(v))
        .map((v) => v.rawContent) as string[])
        .map((v) => v.replace(/ك/g, "ک"))
        .map((v) => v.replace(/ھ/g, "ه"))
        .filter((v) => !/(^| )[اەێۆ]/.test(v))
        .map((v) => v.replace(/[^قوەرتیئحۆپاسدفگهژکلزخجڤبنمڕێعشغڵچ \n]/g, ""))
        .filter((v) => !BLACKLIST.some((e) => v.includes(e)))
        .map((v) => v.replace(/ {2,}/g, " "))
        .map((v) => v.replace(/\n{2,}/g, "\n"))
        .map((v) => v.trim())
        .filter((v) => v),
    );
  } catch (err) {
    console.warn("Failed to process", file, "because of the following error:");
    console.error(err);
  }
  await Deno.stdout.write(
    new TextEncoder().encode(
      `\t${
        (i + 1).toString().padStart(files.length.toString().length, "0")
      }/${files.length}\r`,
    ),
  );
}

tweets = [...new Set(tweets)];

tweets = tweets.filter((v) => v.length >= 30)
  .sort((a, b) => a.length - b.length);

Deno.writeTextFileSync("./tweets.txt", tweets.join("\n"));
