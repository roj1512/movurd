const files = [...Deno.readDirSync("./tweets")]
  .filter((v) => v.isFile && v.name != "all")
  .map((v) => `./tweets/${v.name}`);

const tweets = new Array<string>();

const BLACKLIST = [/گوو/];

for (const file of files) {
  tweets.push(
    ...Deno.readTextFileSync(file)
      .split("\n")
      .filter((v) => v)
      .map((v) => JSON.parse(v))
      .map((v) => v.replace(/ك/g, "ک"))
      .map((v) => v.replace(/ھ/g, "ه"))
      .map((v) => v.replace(/[^قوەرتیئحۆپاسدفگهژکلزخجڤبنمڕێعشغڵچ \n]/g, ""))
      .filter((v) => !BLACKLIST.some((e) => e.test(v)))
      .map((v) => v.replace(/ {2,}/g, " "))
      .map((v) => v.replace(/\n{2,}/g, "\n"))
      .map((v) => v.trim()),
  );
}

Deno.writeTextFileSync(
  "./tweets/all",
  [...new Set(tweets)]
    .join("\n"),
);
