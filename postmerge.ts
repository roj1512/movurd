let lines = Deno.readTextFileSync("./tweets.txt").split("\n")
  .sort((a, b) => a.length - b.length)
  .filter((v) => v.trim());

lines = [...new Set(lines)];

lines = lines.filter((v) => v.length >= 30);

Deno.writeTextFileSync("./tweets.txt", lines.join("\n"));
