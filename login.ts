import { config } from "https://deno.land/std@0.171.0/dotenv/mod.ts";
import { cleanEnv, str } from "https://deno.land/x/envalid@0.1.2/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { auth, Client } from "https://deno.land/x/twi@1.2.2/mod.ts";

await config({ export: true });

const env = cleanEnv(Deno.env.toObject(), {
  CLIENT_ID: str(),
  CLIENT_SECRET: str(),
});

const app = new Application();
const router = new Router();

const authClient = new auth.OAuth2User({
  client_id: env.CLIENT_ID,
  client_secret: env.CLIENT_SECRET,
  callback: "http://127.0.0.1:3000/callback",
  scopes: ["tweet.read", "users.read", "offline.access", "tweet.write"],
});

const client = new Client(authClient);

const STATE = "my-state";

router.get("/callback", async (ctx) => {
  try {
    const { code, state } = Object.fromEntries(
      ctx.request.url.searchParams.entries(),
    );
    if (state !== STATE) {
      ctx.response.status = 500;
      ctx.response.body = "State isn't matching";
      return;
    }
    await authClient.requestAccessToken(code);
    ctx.response.redirect("/test");
  } catch (error) {
    console.log(error);
  }
});

router.get("/login", async (ctx) => {
  const authUrl = await authClient.generateAuthURL({
    state: STATE,
    code_challenge_method: "plain",
    code_challenge: "test",
  });
  ctx.response.redirect(authUrl);
});

router.get("/test", (ctx) => {
  try {
    // const res = await client.tweets.createTweet({ text: "test" });
    // const myUser = await client.users.findMyUser()
    ctx.response.body = authClient.token;
  } catch (error) {
    console.log("tweets error", error);
  }
});

router.get("/revoke", async (ctx) => {
  try {
    const response = await authClient.revokeAccessToken();
    ctx.response.body = response;
  } catch (error) {
    console.log(error);
  }
});

app.use(router.routes());
console.log(`Go here to login: http://127.0.0.1:3000/login`);
await app.listen({ port: 3000 });
