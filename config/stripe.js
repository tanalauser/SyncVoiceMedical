const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            }
        });
        return paymentIntent;
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

async function createSubscription(customerId) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{
                price: process.env.STRIPE_PRICE_ID
            }]
        });
        return subscription;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

module.exports = {
    stripe,
    createPaymentIntent,
    createSubscription
};