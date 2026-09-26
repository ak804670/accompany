import { Router } from 'express';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import { WalletError, WalletService } from './wallet.service.js';
import type { PaymentProvider } from './payment-provider.js';

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) throw new AuthError('SESSION_EXPIRED', 401);
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new AuthError('SESSION_EXPIRED', 401);
  return token;
}

export function createWalletRouter(auth: AuthService, wallet: WalletService, adminKey: string | undefined) {
  const router = Router();

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.get('/wallet', async (request, response, next) => {
    try {
      response.json(await wallet.summary(await userId(request.header('authorization'))));
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.get('/wallet/transactions', async (request, response, next) => {
    try {
      response.json({ transactions: await wallet.transactions(await userId(request.header('authorization'))) });
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.get('/coin-packages', async (_request, response, next) => {
    try {
      response.json({ packages: await wallet.packages() });
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.post('/coin-purchases', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const packageId = typeof request.body?.packageId === 'string' ? request.body.packageId : '';
      const idempotencyKey = typeof request.body?.idempotencyKey === 'string' ? request.body.idempotencyKey.trim() : '';
      if (!packageId || idempotencyKey.length < 8) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a coin package.' } });
        return;
      }
      response.status(201).json(await wallet.createPurchase(id, packageId, idempotencyKey));
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.post('/withdrawals', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const coins = Number(request.body?.coins);
      const idempotencyKey = typeof request.body?.idempotencyKey === 'string' ? request.body.idempotencyKey.trim() : '';
      const method = typeof request.body?.method === 'string' ? request.body.method : '';
      const destination = typeof request.body?.destination === 'string' ? request.body.destination : '';
      if (idempotencyKey.length < 8) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Try the withdrawal again.' } });
        return;
      }
      response.status(201).json(await wallet.requestWithdrawal(id, coins, idempotencyKey, method, destination));
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.get('/withdrawals', async (request, response, next) => {
    try {
      response.json({ withdrawals: await wallet.withdrawals(await userId(request.header('authorization'))) });
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.post('/withdrawals/:id/complete', async (request, response, next) => {
    try {
      if (!admin(request.header('x-admin-key'), adminKey)) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
        return;
      }
      const reference = typeof request.body?.providerReference === 'string' ? request.body.providerReference : '';
      await wallet.settleWithdrawal(request.params.id, 'completed', null, reference);
      response.status(204).end();
    } catch (error) {
      fail(error, response, next);
    }
  });

  router.post('/withdrawals/:id/reject', async (request, response, next) => {
    try {
      if (!admin(request.header('x-admin-key'), adminKey)) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
        return;
      }
      const reason = typeof request.body?.reason === 'string' ? request.body.reason : 'Rejected';
      await wallet.settleWithdrawal(request.params.id, 'rejected', reason, null);
      response.status(204).end();
    } catch (error) {
      fail(error, response, next);
    }
  });

  return router;
}

export function createPaymentWebhook(wallet: WalletService, payments: PaymentProvider) {
  const router = Router();
  router.post('/payments', async (request, response, next) => {
    try {
      const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : '';
      if (!payments.verifyWebhook(raw, request.header('x-payment-signature'))) {
        response.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Payment could not be verified.' } });
        return;
      }
      const body = JSON.parse(raw) as { provider?: string; providerTransactionId?: string; status?: string };
      if (body.status !== 'completed' || !body.provider || !body.providerTransactionId) {
        response.status(202).json({ ignored: true });
        return;
      }
      response.json(await wallet.completePayment(body.provider, body.providerTransactionId));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

function admin(header: string | undefined, key: string | undefined): boolean {
  return Boolean(key) && header === key;
}

function fail(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }, next: (error: unknown) => void) {
  if (error instanceof WalletError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}
