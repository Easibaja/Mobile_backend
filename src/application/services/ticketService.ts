import { randomUUID } from 'crypto';
import { stripe } from '../../infrastructure/external-services/stripe';
import { productById } from '../../domain/catalog';
import { mintTicket, type Ticket } from '../../infrastructure/repositories/ticketRepository';

// Build an Error carrying an HTTP status for the shared errorHandler.
const httpError = (status: number, message: string): Error => {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
};

// Verify the PaymentIntent with Stripe, then mint the ticket idempotently.
export const confirmTicket = async (userId: string, paymentIntentId: string): Promise<Ticket> => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw httpError(400, 'PaymentIntent has not succeeded');
  }
  if (paymentIntent.metadata.userId !== userId) {
    throw httpError(403, 'PaymentIntent does not belong to the current user');
  }

  const product = productById(paymentIntent.metadata.productId);

  return mintTicket({
    userId,
    placeId: paymentIntent.metadata.placeId,
    placeName: paymentIntent.metadata.placeName,
    productId: paymentIntent.metadata.productId,
    productLabel: product?.label ?? paymentIntent.metadata.productId,
    amountMinor: paymentIntent.amount,
    currency: paymentIntent.currency.toUpperCase(),
    qrToken: randomUUID(),
    paymentIntentId: paymentIntent.id,
  });
};
