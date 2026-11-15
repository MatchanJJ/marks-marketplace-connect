import assert from "node:assert/strict";
import { test } from "node:test";
import { priceInCents, formatPrice, listingError, buyerMessageError, searchPattern } from "../src/lib/marketplace.ts";

test("prices use exact integer cents, including free listings and decimal boundaries", () => {
  for (const [price, cents] of [["0", 0], ["0.01", 1], [".50", 50], ["19.99", 1999], [" 12.3 ", 1230], ["999999.99", 99999999]]) {
    assert.equal(priceInCents(price), cents);
  }
  for (const price of ["", " ", "-1", "1.001", "1000000", "NaN", "Infinity", "1e3", "12,000", "12abc"]) {
    assert.equal(priceInCents(price), null, price);
  }
  assert.equal(formatPrice(1999), "$19.99");
});

const draft = { title: "Desk lamp", description: "A working blue lamp.", price: "12.50", category: "Furniture", seller_email: "seller@example.com" };

test("listing validation requires bounded content, a real category, price, and seller contact", () => {
  assert.equal(listingError(draft), null);
  for (const changes of [{title:" \n"}, {title:"a".repeat(121)}, {description:""}, {description:"a".repeat(3001)}, {price:"-1"}, {category:"unknown"}, {seller_email:"not-an-email"}, {seller_email:"a".repeat(250)+"@example.com"}]) {
    assert.ok(listingError({...draft,...changes}));
  }
  assert.equal(listingError({...draft,title:"😀".repeat(120)}), null);
});

test("buyer messages require contact information and a bounded, nonblank message", () => {
  assert.equal(buyerMessageError("buyer@example.com", "Is this available?"), null);
  assert.ok(buyerMessageError("bad", "Hello"));
  assert.ok(buyerMessageError("buyer@example.com", " \n\t"));
  assert.ok(buyerMessageError("buyer@example.com", "a".repeat(2001)));
  assert.equal(buyerMessageError("buyer@example.com", "😀".repeat(2000)), null);
});

test("keyword searches treat SQL wildcard characters as literal text", () => {
  assert.equal(searchPattern("100%_\\"), "%100\\%\\_\\\\%");
  assert.equal(searchPattern("bike, title.eq.hidden"), "%bike, title.eq.hidden%");
});
