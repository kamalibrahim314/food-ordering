// services/paymobService.js
import axios from "axios";
import crypto from "crypto";
import { AppError } from "../utils/appError";

const PAYMOB_API_URL = process.env.PAYMOB_API_URL || "https://accept.paymob.com/api";

const getAuthToken = async () => {
    try {
        const { data } = await axios.post(`${PAYMOB_API_URL}/auth/tokens`, {
            api_key: process.env.PAYMOB_API_KEY,
        });
        return data.token;
    } catch (error) {
        console.error("Paymob auth error:", error.response?.data || error.message);
        throw new AppError("failed to get auth token");
    }
};

const createOrder = async (token, amountCents, merchantOrderId) => {
    try {
        const { data } = await axios.post(`${PAYMOB_API_URL}/ecommerce/orders`, {
            auth_token: token,
            delivery_needed: false,
            amount_cents: amountCents,
            currency: "EGP",
            items: [],
            merchant_order_id: merchantOrderId,
        });
        return data;
    } catch (error) {
        console.error("Paymob order error:", error.response?.data || error.message);
        throw new AppError("failed to create order");
    }
};

const generatePaymentKey = async (token, amountCents, orderId, billing) => {
    try {
        const { data } = await axios.post(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
            auth_token: token,
            amount_cents: amountCents,
            expiration: 600,
            order_id: orderId,
            billing_data: billing,
            currency: "EGP",
            integration_id: process.env.PAYMOB_INTEGRATION_ID,
            lock_order_when_paid: true,
        });
        return data.token;
    } catch (error) {
        console.error("Paymob payment key error:", error.response?.data || error.message);
        throw new AppError("failed to generate payment key");
    }
};

const orderedKeys = [
    "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id",
    "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order.id", "owner", "pending", "source_data.sub_type", "source_data.type", "success",
];

const isValidHmac = (payload) => {
    if (!payload?.hmac) {
        console.error("HMAC missing in payload");
        return false;
    }

    const message = orderedKeys
        .map((k) => {
            const [root, child] = k.split('.');
            let value;
            if (child) value = payload[root]?.[child] ?? payload[root] ?? '';
            else value = payload[root] ?? '';
            return String(value);
        })
        .join('');

    const calculatedHmac = crypto
        .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
        .update(message)
        .digest("hex");

    try {
        const isValid = crypto.timingSafeEqual(
            Buffer.from(calculatedHmac, 'hex'),
            Buffer.from(payload.hmac, 'hex')
        );

        if (!isValid) {
            console.error("HMAC verification failed");
            console.log("Calculated:", calculatedHmac);
            console.log("Received:", payload.hmac);
        }

        return isValid;
    } catch (error) {
        console.error("HMAC comparison error:", error);
        return false;
    }
};

module.exports = {
    getAuthToken,
    createOrder,
    generatePaymentKey,
    isValidHmac,
};
