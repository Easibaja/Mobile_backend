import { stripe } from '../../infrastructure/external-services/stripe';
import type { TicketProduct } from '../../domain/catalog';

type CreatePaymentIntentInput = {
  userId: string;
  placeId: string;
  placeName: string;
  product: TicketProduct;
};

type PaymentIntentResult = {
  clientSecret: string;
  amountMinor: number;
  currency: string;
  productLabel: string;
};

// Create a test-mode PaymentIntent for a catalog product. The price comes only
// from the product (never the client), and placeName/userId/placeId/productId go
// into metadata so /tickets/confirm can mint and validate the ticket later.
export const createPaymentIntent = async (
  input: CreatePaymentIntentInput,
): Promise<PaymentIntentResult> => {
  const { userId, placeId, placeName, product } = input;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: product.amountMinor,
    currency: product.currency.toLowerCase(),
    // Let Stripe serve dynamic payment methods (managed in the Dashboard);
    // never hardcode payment_method_types.
    automatic_payment_methods: { enabled: true },
    metadata: { userId, placeId, productId: product.id, placeName },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a client secret');
  }

  return {
    clientSecret: paymentIntent.client_secret,
    amountMinor: product.amountMinor,
    currency: product.currency,
    productLabel: product.label,
  };
};
