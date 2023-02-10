const files = [...Deno.readDirSync("./tweet_data/data")]
  .map((v) => `./tweet_data/data/${v.name}`);

const tweets = new Array<string>();

const BLACKLIST = [/گوو/]; // TODO: improve this

for (const file of files) {
  try {
    tweets.push(
      ...(Deno.readTextFileSync(file)
        .split("\n")
        .filter((v) => v)
        .map((v) => JSON.parse(v))
        .map((v) => v.rawContent) as string[])
        .map((v) => v.replace(/ك/g, "ک"))
        .map((v) => v.replace(/ھ/g, "ه"))
        .map((v) => v.replace(/[^قوەرتیئحۆپاسدفگهژکلزخجڤبنمڕێعشغڵچ \n]/g, ""))
        .filter((v) => !BLACKLIST.some((e) => e.test(v)))
        .map((v) => v.replace(/ {2,}/g, " "))
        .map((v) => v.replace(/\n{2,}/g, "\n"))
        .map((v) => v.trim()),
    );
  } catch (err) {
    console.warn("Failed to process", file, "because of the following error:");
    console.error(err);
  }
}

Deno.writeTextFileSync("./tweets.txt", [...new Set(tweets)].join("\n"));
