export interface DpoCreateTokenParams {
  amount: number;
  currency: string;
  companyRef: string;
  redirectUrl: string;
  backUrl: string;
  serviceDescription: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
}

export interface DpoCreateTokenResult {
  success: boolean;
  result?: string;
  resultExplanation?: string;
  transToken?: string;
  transRef?: string;
  error?: string;
}

export interface DpoVerifyTokenResult {
  success: boolean;
  paid: boolean;
  result?: string;
  resultExplanation?: string;
  transactionAmount?: number;
  transactionCurrency?: string;
  error?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readXmlTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const match = xml.match(re);
  return match?.[1]?.trim();
}

function formatServiceDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

class DpoPaymentService {
  private apiUrl: string;
  private checkoutBaseUrl: string;
  private companyToken: string;
  private serviceType: string;
  private defaultCurrency: string;
  private ptlHours: number;

  constructor() {
    this.apiUrl =
      process.env.DPO_API_URL || "https://secure.3gdirectpay.com/API/v6/";
    this.checkoutBaseUrl =
      process.env.DPO_CHECKOUT_URL ||
      "https://secure.3gdirectpay.com/payv3.php";
    this.companyToken =
      process.env.DPO_COMPANY_TOKEN || "8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3";
    this.serviceType = process.env.DPO_SERVICE_TYPE || "3854";
    this.defaultCurrency = process.env.DPO_PAYMENT_CURRENCY || "ZAR";
    this.ptlHours = parseInt(process.env.DPO_PTL_HOURS || "5", 10);
  }

  getDefaultCurrency(): string {
    return this.defaultCurrency;
  }

  getCheckoutUrl(transToken: string): string {
    const separator = this.checkoutBaseUrl.includes("?") ? "&" : "?";
    return `${this.checkoutBaseUrl}${separator}ID=${encodeURIComponent(transToken)}`;
  }

  private async postXml(xml: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml",
      },
      body: xml,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`DPO API HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return text;
  }

  async createToken(
    params: DpoCreateTokenParams,
  ): Promise<DpoCreateTokenResult> {
    const currency = params.currency || this.defaultCurrency;
    const amount = params.amount.toFixed(2);
    const firstName = escapeXml(params.customerFirstName || "Ntsamaela");
    const lastName = escapeXml(params.customerLastName || "User");
    const email = escapeXml(params.customerEmail || "payments@ntsamaela.app");

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(this.companyToken)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>${escapeXml(currency)}</PaymentCurrency>
    <CompanyRef>${escapeXml(params.companyRef)}</CompanyRef>
    <RedirectURL>${escapeXml(params.redirectUrl)}</RedirectURL>
    <BackURL>${escapeXml(params.backUrl)}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>${this.ptlHours}</PTL>
    <customerFirstName>${firstName}</customerFirstName>
    <customerLastName>${lastName}</customerLastName>
    <customerEmail>${email}</customerEmail>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${escapeXml(this.serviceType)}</ServiceType>
      <ServiceDescription>${escapeXml(params.serviceDescription)}</ServiceDescription>
      <ServiceDate>${formatServiceDate()}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

    try {
      const responseXml = await this.postXml(xml);
      const result = readXmlTag(responseXml, "Result");
      const resultExplanation = readXmlTag(responseXml, "ResultExplanation");

      if (result !== "000") {
        return {
          success: false,
          result,
          resultExplanation,
          error: resultExplanation || `DPO createToken failed (${result})`,
        };
      }

      return {
        success: true,
        result,
        resultExplanation,
        transToken: readXmlTag(responseXml, "TransToken"),
        transRef: readXmlTag(responseXml, "TransRef"),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "DPO createToken request failed",
      };
    }
  }

  async verifyToken(transactionToken: string): Promise<DpoVerifyTokenResult> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(this.companyToken)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${escapeXml(transactionToken)}</TransactionToken>
</API3G>`;

    try {
      const responseXml = await this.postXml(xml);
      const result = readXmlTag(responseXml, "Result");
      const resultExplanation = readXmlTag(responseXml, "ResultExplanation");
      const amountRaw = readXmlTag(responseXml, "TransactionAmount");
      const currency = readXmlTag(responseXml, "TransactionCurrency");

      const paid = result === "000";

      return {
        success:
          result !== undefined &&
          !["801", "802", "803", "804"].includes(result),
        paid,
        result,
        resultExplanation,
        transactionAmount: amountRaw ? parseFloat(amountRaw) : undefined,
        transactionCurrency: currency,
      };
    } catch (error: any) {
      return {
        success: false,
        paid: false,
        error: error?.message || "DPO verifyToken request failed",
      };
    }
  }
}

export const dpoPaymentService = new DpoPaymentService();
