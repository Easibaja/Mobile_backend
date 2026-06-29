import { prisma } from '../db/prismaClient';
import type { Ticket as TicketModel } from '../../generated/prisma/client';

// Public ticket shape
export type Ticket = {
  id: string;
  placeId: string;
  placeName: string;
  productId: string;
  productLabel: string;
  amountMinor: number;
  currency: string;
  status: string;
  qrToken: string;
  purchasedAt: string;
  paymentIntentId: string;
};

export type MintTicketInput = {
  userId: string;
  placeId: string;
  placeName: string;
  productId: string;
  productLabel: string;
  amountMinor: number;
  currency: string;
  qrToken: string;
  paymentIntentId: string;
};

const mapToTicket = (row: TicketModel): Ticket => ({
  id: row.id,
  placeId: row.placeId,
  placeName: row.placeName,
  productId: row.productId,
  productLabel: row.productLabel,
  amountMinor: row.amountMinor,
  currency: row.currency,
  status: row.status,
  qrToken: row.qrToken,
  purchasedAt: row.purchasedAt.toISOString(),
  paymentIntentId: row.paymentIntentId,
});

// Idempotent on paymentIntentId: if a ticket already exists for this PaymentIntent,
// return it unchanged; otherwise create it. The UNIQUE constraint is the guarantee.
export const mintTicket = async (input: MintTicketInput): Promise<Ticket> => {
  const row = await prisma.ticket.upsert({
    where: { paymentIntentId: input.paymentIntentId },
    create: input,
    update: {},
  });
  return mapToTicket(row);
};
