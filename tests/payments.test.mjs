import assert from "node:assert/strict";
import { test } from "node:test";
import { isUuid,platformFee,sellerReady,PAYMENT_APP,paymentMatchesOrder } from "../src/lib/payments.ts";

test("platform fees stay in integer cents and round down",()=>{
  for (const amount of [50,51,99,100,1250,99999999]) {
    const fee=platformFee(amount); assert.equal(fee,Math.floor(amount/10)); assert.ok(Number.isInteger(fee) && fee>0 && fee<amount);
  }
});
test("only fully onboarded sellers are ready for purchases",()=>{
  assert.equal(sellerReady(null),false);
  for (let flags=0;flags<8;flags++) assert.equal(sellerReady({ charges_enabled:Boolean(flags&1),payouts_enabled:Boolean(flags&2),details_submitted:Boolean(flags&4) }),flags===7);
});
test("payment events must match the exact app, order, account, session, amount and currency",()=>{
  const order={ id:"d4c15dc2-b00d-4f5a-a2e0-3287fcd972b9",stripe_account_id:"acct_own",stripe_session_id:"cs_test_own",amount_cents:1250,currency:"usd" };
  const session={ id:"cs_test_own",livemode:false,status:"complete",payment_status:"paid",amount_total:1250,currency:"usd",metadata:{app:PAYMENT_APP,order_id:order.id} };
  assert.equal(paymentMatchesOrder(session,"acct_own",order),true);
  for (const patch of [{livemode:true},{status:"open"},{payment_status:"unpaid"},{amount_total:1},{currency:"eur"},{id:"cs_other"},{metadata:{app:"other-app",order_id:order.id}},{metadata:{app:PAYMENT_APP,order_id:"other"}}]) assert.equal(paymentMatchesOrder({...session,...patch},"acct_own",order),false);
  assert.equal(paymentMatchesOrder(session,"acct_other",order),false);
  assert.equal(isUuid(order.id),true); assert.equal(isUuid("not-an-id"),false);
});
