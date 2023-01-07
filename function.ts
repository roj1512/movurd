import { AuthHeader } from "https://deno.land/x/twi@1.2.2/types.ts";
import { auth, Client } from "https://deno.land/x/twi@1.2.2/mod.ts";
import "https://deno.land/std@0.171.0/dotenv/load.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { cleanEnv, str, url } from "https://deno.land/x/envalid@0.1.2/mod.ts";

const env = cleanEnv(Deno.env.toObject(), {
  CLIENT_ID: str(),
  CLIENT_SECRET: str(),
  API_URL: url(),
  MONGODB_URI: url(),
});

const database = await new MongoClient().connect(env.MONGODB_URI);
const token = database.collection("token");
const tweetedTexts = (database).collection("tweeted_texts");

//#region utils

class OAuth2User extends auth.OAuth2User {
  async getAuthHeader(): Promise<AuthHeader> {
    const wasExpired = this.isAccessTokenExpired();
    const authHeader = await super.getAuthHeader();
    if (wasExpired) {
      await token.updateOne({}, { $set: { ...this.token } });
    }
    return authHeader;
  }
}

async function digest(string: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(string),
      ),
    ),
  )
    .map((b) =>
      b.toString(16)
        .padStart(2, "0")
    ).join("");
}

//#endregion utils

const authClient = new OAuth2User({
  client_id: env.CLIENT_ID,
  client_secret: env.CLIENT_SECRET,
  callback: "",
  scopes: ["tweet.read", "users.read", "offline.access", "tweet.write"],
});
authClient.token = await token.findOne();
const client = new Client(authClient);

const response = await fetch(env.API_URL);

if (response.status == 200) {
  const text = await response.text();
  const hash = await digest(text);
  const alreadyTweeted = typeof (await tweetedTexts.findOne({ hash })) ===
    "object";

  if (!alreadyTweeted) {
    const response = await client.tweets.createTweet({ text });
    if (response.data) {
      await tweetedTexts.insertOne({
        tweetedAt: new Date(),
        hash,
        tweet: response.data,
      });
    }
  }
}
