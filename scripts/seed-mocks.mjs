import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, LISTING_IMAGE_BUCKET, listingError } from "../src/lib/marketplace.ts";
import { photoError } from "../src/lib/photos.ts";

const mocks = JSON.parse(await readFile(new URL("../fixtures/mock-listings.json", import.meta.url), "utf8"));
assert.equal(mocks.length, CATEGORIES.length);
assert.deepEqual(new Set(mocks.map(item => item.category)), new Set(CATEGORIES));
const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, "Configure the marketplace project first.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (const mock of [...mocks].reverse()) {
  const description = `MOCK LISTING: for demonstration only; no item is available.\n\n${mock.details}\n\nStock photo: ${mock.credit} / Pexels. ${mock.source}`;
  assert.equal(listingError({ ...mock, description, price: (mock.price_cents / 100).toFixed(2), seller_email: "demo@example.com" }), null);
  assert.match(mock.photo, /^[a-z]+\.jpg$/);
  const existing = await client.from("listings").select("id").eq("title", mock.title).eq("seller_email", "demo@example.com").maybeSingle();
  assert.ifError(existing.error);
  if (existing.data) { console.log(`Already present: ${mock.category}`); continue; }
  const photo = await readFile(new URL(`../public/mock/${mock.photo}`, import.meta.url));
  assert.equal(photoError({ size: photo.length, type: "image/jpeg" }), null);
  assert.equal(photo.subarray(0, 3).toString("hex"), "ffd8ff");
  const image_path = `${randomUUID()}.jpg`;
  assert.ifError((await client.storage.from(LISTING_IMAGE_BUCKET).upload(image_path, photo, { contentType: "image/jpeg", upsert: false })).error);
  const result = await client.from("listings").insert({ title: mock.title, description, category: mock.category, price_cents: mock.price_cents, seller_email: "demo@example.com", image_path }).select("id").single();
  assert.ifError(result.error);
  console.log(`Created ${mock.category}: ${result.data.id}`);
}
const seeded = await client.from("listings").select("category,image_path").in("title", mocks.map(item => item.title)).eq("seller_email", "demo@example.com");
assert.ifError(seeded.error);
assert.equal(seeded.data.length, CATEGORIES.length);
assert.deepEqual(new Set(seeded.data.map(item => item.category)), new Set(CATEGORIES));
for (const item of seeded.data) {
  const response = await fetch(client.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(item.image_path).data.publicUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^image\/jpeg/);
}
console.log("Verified: one labelled mock listing and a working stock photo in every category.");
