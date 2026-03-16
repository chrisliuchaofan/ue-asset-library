import { NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/billing/stripe';
import {
  handleSubscriptionChange,
  handleSubscriptionDeleted,
} from '@/lib/billing/billing-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook
 * Stripe Webhook 处理
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ message: 'Missing stripe-signature' }, { status: 400 });
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET 未配置');
      return NextResponse.json({ message: 'Webhook secret not configured' }, { status: 500 });
    }

    // 验证签名
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    // 处理事件
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        // 付款成功 — 订阅续期时触发积分分配
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(subscription);
        }
        break;

      case 'invoice.payment_failed':
        console.warn('[Webhook] Payment failed:', event.data.object);
        break;

      default:
        // 忽略未处理的事件
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
