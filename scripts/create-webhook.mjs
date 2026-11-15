import assert from "node:assert/strict";
import { readFile,writeFile } from "node:fs/promises";
import Stripe from "stripe";
import { PAYMENT_APP } from "../src/lib/payments.ts";
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),"Only sandbox keys are allowed.");
const origin=new URL(process.env.APP_URL).origin;
assert.ok(origin.startsWith("https://"),"Deploy to a public HTTPS production URL first.");
const url=origin+"/api/stripe/webhook";
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
const owned=(await stripe.webhookEndpoints.list({limit:100})).data.filter(endpoint=>endpoint.url===url&&endpoint.metadata.app===PAYMENT_APP);
const previous=owned.find(endpoint=>endpoint.application&&endpoint.status==="enabled");
if(previous){assert.ok(process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"),"An endpoint exists; use its previously saved signing secret.");console.log(JSON.stringify({id:previous.id,url,alreadyRegistered:true}));}
else{
  const endpoint=await stripe.webhookEndpoints.create({url,connect:true,api_version:Stripe.API_VERSION,
    enabled_events:["checkout.session.completed","checkout.session.async_payment_succeeded","account.updated"],metadata:{app:PAYMENT_APP},description:"Mark's standalone Test 4 sandbox marketplace"});
  assert.ok(endpoint.application,"Enable Connect in this sandbox before registering a connected-account webhook.");
  assert.ok(endpoint.secret?.startsWith("whsec_"));
  const envPath=new URL("../.env.local",import.meta.url);let env=await readFile(envPath,"utf8");
  const line="STRIPE_WEBHOOK_SECRET="+endpoint.secret;
  env=/^STRIPE_WEBHOOK_SECRET=.*$/m.test(env)?env.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m,line):env.trimEnd()+"\n"+line+"\n";
  await writeFile(envPath,env);
  for(const stale of owned.filter(endpoint=>!endpoint.application&&endpoint.status==="enabled")) await stripe.webhookEndpoints.update(stale.id,{disabled:true});
  console.log(JSON.stringify({id:endpoint.id,url,connectApplication:endpoint.application,signingSecretSavedPrivately:true}));
}
