import { dpoPaymentService } from "./dpoPaymentService";

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
  paymentUrl?: string;
  reference?: string;
}

export interface PaymentStatus {
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  amount?: number;
  currency?: string;
  metadata?: any;
}

/**
 * Payment Service
 * Supports multiple providers: Stripe, Paystack, DPO, or mock for development
 */
class PaymentService {
  private provider: string;
  private apiKey?: string;
  private secretKey?: string;
  private publicKey?: string;

  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || "mock";
    // Support both generic and specific env vars
    this.apiKey = process.env.PAYMENT_API_KEY;
    this.secretKey =
      process.env.PAYMENT_SECRET_KEY ||
      (this.provider === "stripe"
        ? process.env.STRIPE_SECRET_KEY
        : undefined) ||
      (this.provider === "paystack"
        ? process.env.PAYSTACK_SECRET_KEY
        : undefined);
    this.publicKey =
      process.env.PAYMENT_PUBLIC_KEY ||
      (this.provider === "stripe"
        ? process.env.STRIPE_PUBLISHABLE_KEY
        : undefined) ||
      (this.provider === "paystack"
        ? process.env.PAYSTACK_PUBLIC_KEY
        : undefined);
  }

  async processPayment(
    amount: number,
    currency: string,
    paymentMethod: string,
    metadata?: any,
  ): Promise<PaymentResponse> {
    try {
      switch (this.provider) {
        case "stripe":
          return await this.processViaStripe(
            amount,
            currency,
            paymentMethod,
            metadata,
          );
        case "paystack":
          return await this.processViaPaystack(
            amount,
            currency,
            paymentMethod,
            metadata,
          );
        case "dpo":
          return await this.processViaDpo(
            amount,
            currency,
            paymentMethod,
            metadata,
          );
        case "mock":
        default:
          return await this.processViaMock(
            amount,
            currency,
            paymentMethod,
            metadata,
          );
      }
    } catch (_error: any) {
      console.error("Payment processing error:", _error);
      return {
        success: false,
        error: _error.message || "Failed to process payment",
      };
    }
  }

  private async processViaStripe(
    amount: number,
    currency: string,
    paymentMethod: string,
    metadata?: any,
  ): Promise<PaymentResponse> {
    if (!this.secretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = require("stripe")(this.secretKey);

    try {
      let paymentIntent;

      if (paymentMethod === "card") {
        // Create payment intent for card payment
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          metadata: metadata || {},
          automatic_payment_methods: {
            enabled: true,
          },
        });

        return {
          success: true,
          transactionId: paymentIntent.id,
          message: "Payment intent created",
          paymentUrl: paymentIntent.client_secret,
        };
      } else {
        throw new Error("Unsupported payment method for Stripe");
      }
    } catch (_error: any) {
      throw new Error(`Stripe error: ${_error.message}`);
    }
  }

  private async processViaPaystack(
    amount: number,
    currency: string,
    paymentMethod: string,
    metadata?: any,
  ): Promise<PaymentResponse> {
    // Use Paystack-specific env var if generic one not set
    const secretKey = this.secretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const https = require("https");

    const postData = JSON.stringify({
      amount: Math.round(amount * 100), // Convert to kobo
      currency: currency.toUpperCase(),
      email: metadata?.email || "customer@example.com",
      metadata: metadata || {},
      callback_url: metadata?.callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.paystack.co",
        port: 443,
        path: "/transaction/initialize",
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Content-Length": postData.length,
        },
      };

      const req = https.request(options, (res: any) => {
        let data = "";

        res.on("data", (chunk: any) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve({
                success: true,
                transactionId: response.data.reference,
                message: "Payment initialized",
                paymentUrl: response.data.authorization_url,
                reference: response.data.reference,
              });
            } else {
              reject(new Error(response.message || "Paystack payment failed"));
            }
          } catch (_error: any) {
            reject(new Error("Failed to parse Paystack response"));
          }
        });
      });

      req.on("error", (_error: any) => {
        reject(new Error(`Paystack request error: ${_error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  private async processViaDpo(
    amount: number,
    currency: string,
    _paymentMethod: string,
    metadata?: any,
  ): Promise<PaymentResponse> {
    const companyRef =
      metadata?.companyRef ||
      `NTS-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const apiBase =
      process.env.API_PUBLIC_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    const backUrl =
      process.env.DPO_CALLBACK_URL || `${apiBase}/api/webhooks/dpo`;
    const redirectUrl =
      process.env.DPO_REDIRECT_URL || `${apiBase}/api/wallet/recharge/return`;

    const result = await dpoPaymentService.createToken({
      amount,
      currency: currency || dpoPaymentService.getDefaultCurrency(),
      companyRef,
      redirectUrl,
      backUrl,
      serviceDescription: metadata?.description || "Ntsamaela payment",
      customerFirstName: metadata?.firstName,
      customerLastName: metadata?.lastName,
      customerEmail: metadata?.email,
    });

    if (!result.success || !result.transToken) {
      return {
        success: false,
        error: result.error || result.resultExplanation || "DPO payment failed",
      };
    }

    return {
      success: true,
      transactionId: result.transToken,
      reference: companyRef,
      message: result.resultExplanation || "Payment initialized",
      paymentUrl: dpoPaymentService.getCheckoutUrl(result.transToken),
    };
  }

  private async processViaMock(
    amount: number,
    currency: string,
    paymentMethod: string,
    metadata?: any,
  ): Promise<PaymentResponse> {
    // For development, just return a mock transaction ID
    console.log("💳 Payment (Mock - Development Mode):");
    console.log(`Amount: ${amount} ${currency}`);
    console.log(`Method: ${paymentMethod}`);
    console.log(`Metadata:`, metadata);

    return {
      success: true,
      transactionId: `txn_mock_${Date.now()}`,
      message: "Payment processed (mock mode)",
    };
  }

  async refundPayment(
    transactionId: string,
    amount: number,
  ): Promise<PaymentResponse> {
    try {
      switch (this.provider) {
        case "stripe":
          return await this.refundViaStripe(transactionId, amount);
        case "paystack":
          return await this.refundViaPaystack(transactionId, amount);
        case "mock":
        default:
          return await this.refundViaMock(transactionId, amount);
      }
    } catch (_error: any) {
      console.error("Refund error:", _error);
      return {
        success: false,
        error: _error.message || "Failed to refund payment",
      };
    }
  }

  private async refundViaStripe(
    transactionId: string,
    amount: number,
  ): Promise<PaymentResponse> {
    if (!this.secretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = require("stripe")(this.secretKey);

    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100),
      });

      return {
        success: true,
        transactionId: refund.id,
        message: "Refund processed successfully",
      };
    } catch (_error: any) {
      throw new Error(`Stripe refund error: ${_error.message}`);
    }
  }

  private async refundViaPaystack(
    transactionId: string,
    amount: number,
  ): Promise<PaymentResponse> {
    const secretKey = this.secretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const https = require("https");

    const postData = JSON.stringify({
      transaction: transactionId,
      amount: Math.round(amount * 100),
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.paystack.co",
        port: 443,
        path: "/refund",
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Content-Length": postData.length,
        },
      };

      const req = https.request(options, (res: any) => {
        let data = "";

        res.on("data", (chunk: any) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve({
                success: true,
                transactionId: response.data.id,
                message: "Refund processed successfully",
              });
            } else {
              reject(new Error(response.message || "Paystack refund failed"));
            }
          } catch (_error: any) {
            reject(new Error("Failed to parse Paystack response"));
          }
        });
      });

      req.on("error", (_error: any) => {
        reject(new Error(`Paystack request error: ${_error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  private async refundViaMock(
    transactionId: string,
    amount: number,
  ): Promise<PaymentResponse> {
    console.log("💳 Refund (Mock - Development Mode):");
    console.log(`Transaction ID: ${transactionId}`);
    console.log(`Amount: ${amount}`);

    return {
      success: true,
      transactionId: `refund_mock_${Date.now()}`,
      message: "Refund processed (mock mode)",
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      switch (this.provider) {
        case "stripe":
          return await this.getStatusViaStripe(transactionId);
        case "paystack":
          return await this.getStatusViaPaystack(transactionId);
        case "dpo":
          return await this.getStatusViaDpo(transactionId);
        case "mock":
        default:
          return await this.getStatusViaMock(transactionId);
      }
    } catch (_error: any) {
      console.error("Get payment status error:", _error);
      return {
        status: "failed",
      };
    }
  }

  private async getStatusViaStripe(
    transactionId: string,
  ): Promise<PaymentStatus> {
    if (!this.secretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = require("stripe")(this.secretKey);

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

      let status: "pending" | "completed" | "failed" | "refunded" = "pending";
      if (paymentIntent.status === "succeeded") {
        status = "completed";
      } else if (
        paymentIntent.status === "canceled" ||
        paymentIntent.status === "payment_failed"
      ) {
        status = "failed";
      }

      return {
        status,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (_error: any) {
      throw new Error(`Stripe status error: ${_error.message}`);
    }
  }

  private async getStatusViaPaystack(
    transactionId: string,
  ): Promise<PaymentStatus> {
    const secretKey = this.secretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const https = require("https");

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.paystack.co",
        port: 443,
        path: `/transaction/verify/${transactionId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      };

      const req = https.request(options, (res: any) => {
        let data = "";

        res.on("data", (chunk: any) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              const transaction = response.data;
              let status: "pending" | "completed" | "failed" | "refunded" =
                "pending";

              if (transaction.status === "success") {
                status = "completed";
              } else if (transaction.status === "failed") {
                status = "failed";
              }

              resolve({
                status,
                transactionId: transaction.reference,
                amount: transaction.amount / 100,
                currency: transaction.currency,
                metadata: transaction.metadata,
              });
            } else {
              reject(
                new Error(response.message || "Paystack status check failed"),
              );
            }
          } catch (_error: any) {
            reject(new Error("Failed to parse Paystack response"));
          }
        });
      });

      req.on("error", (_error: any) => {
        reject(new Error(`Paystack request error: ${_error.message}`));
      });

      req.end();
    });
  }

  private async getStatusViaDpo(transactionId: string): Promise<PaymentStatus> {
    const verification = await dpoPaymentService.verifyToken(transactionId);
    let status: "pending" | "completed" | "failed" | "refunded" = "pending";
    if (verification.paid) {
      status = "completed";
    } else if (
      verification.result &&
      ["901", "904"].includes(verification.result)
    ) {
      status = "failed";
    }

    return {
      status,
      transactionId,
      amount: verification.transactionAmount,
      currency: verification.transactionCurrency,
    };
  }

  private async getStatusViaMock(
    transactionId: string,
  ): Promise<PaymentStatus> {
    console.log("💳 Get Payment Status (Mock - Development Mode):");
    console.log(`Transaction ID: ${transactionId}`);

    return {
      status: "completed",
      transactionId,
      amount: 100,
      currency: "USD",
    };
  }
}

export const paymentService = new PaymentService();

export const processPayment = async (
  amount: number,
  currency: string,
  paymentMethod: string,
): Promise<PaymentResponse> => {
  return await paymentService.processPayment(amount, currency, paymentMethod);
};

export const refundPayment = async (
  transactionId: string,
  amount: number,
): Promise<PaymentResponse> => {
  return await paymentService.refundPayment(transactionId, amount);
};

export const getPaymentStatus = async (
  transactionId: string,
): Promise<PaymentStatus> => {
  return await paymentService.getPaymentStatus(transactionId);
};
