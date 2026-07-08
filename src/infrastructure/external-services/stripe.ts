import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment');
}

// apiVersion is the literal the installed `stripe` SDK (v22) pins as its
// LatestApiVersion. Keep it in sync with the SDK when upgrading.
// See: https://docs.stripe.com/changelog/dahlia
export const stripe = new Stripe(secretKey, {
  apiVersion: '2026-06-24.dahlia',
});
