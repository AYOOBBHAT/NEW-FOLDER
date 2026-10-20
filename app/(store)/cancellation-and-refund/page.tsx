import Link from "next/link";
import { OwnerNote, PolicyDocument } from "@/components/policy-document";
import { policyMetadata, site } from "@/lib/site";

export const metadata = policyMetadata(
  "Cancellation, Return, Refund & Exchange",
  "Kashmiriloom cancellation before dispatch, returns for damaged or incorrect items, exchanges, and refunds. Change-of-mind returns are not accepted.",
  "/cancellation-and-refund",
);

export default function CancellationAndRefundPage() {
  return (
    <PolicyDocument
      eyebrow="Store policy"
      title="Cancellation, return, refund and exchange"
      lede={`${site.name}, ${site.location}. Customer support: ${site.phoneDisplay}. Effective date: to be confirmed.`}
    >
      <section>
        <h2>1. Order cancellation</h2>
        <p>
          You may request cancellation of an order before it has been dispatched. Call{" "}
          <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a> and give your order number.
        </p>
        <ul>
          <li>Cancellation is subject to confirmation that the order has not already been dispatched.</li>
          <li>
            Once an order has been dispatched, cancellation under this policy is not available. You may still call if there is a delivery issue or another exceptional circumstance.
          </li>
          <li>
            If payment has already been collected for an order that is successfully cancelled, the applicable refund will be processed through the original payment method where that method supports it.
          </li>
          <li>
            No cancellation fee is currently specified. Any proposed fee must be reviewed and disclosed before it is applied.
          </li>
        </ul>
        <p>
          While an order is still waiting for payment, you can also cancel it on the order page in the browser that placed it. Counted stock reserved for that unpaid order is released when it is cancelled. If payment is not verified within 30 minutes, the hold ends, the unpaid order is cancelled, and it is not marked paid. After payment has been verified, the website has no cancel button. A later cancellation request is made by phone, and only before dispatch.
        </p>
      </section>

      <section>
        <h2>2. Return eligibility</h2>
        <p>{site.name} accepts a return request when an item arrives:</p>
        <ul>
          <li>Damaged.</li>
          <li>Different from the item ordered.</li>
          <li>Incorrect in design, colour, quantity, or another material product detail compared with the order.</li>
        </ul>
        <p>
          Change-of-mind returns are not accepted under this policy. This restriction does not affect any right you may have under applicable law.
        </p>
        <p>
          To request a return, call <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a> and provide your order number, a description of the issue, and clear photographs of the item and its packaging where relevant.
        </p>
        <p>
          Keep the item and the packaging until we reply with instructions. Do not send an item back without contacting us first. {site.name} will review the request and say whether a return, replacement, exchange, or refund is appropriate. A request is assessed fairly and in line with applicable consumer-protection requirements.
        </p>
      </section>

      <section>
        <h2>3. Exchanges</h2>
        <p>An exchange is limited to an item that arrives damaged or incorrect.</p>
        <ul>
          <li>Contact customer support with your order number and supporting photographs.</li>
          <li>We will review the issue and confirm the available resolution.</li>
          <li>A replacement or exchange depends on product availability.</li>
          <li>If a suitable replacement is unavailable, an appropriate refund or another legally required remedy may be offered.</li>
        </ul>
        <p>You cannot request an exchange only because you have changed your mind.</p>
      </section>

      <section>
        <h2>4. Refunds</h2>
        <p>Where a refund is approved, the amount and the method will be told to you.</p>
        <ul>
          <li>A refund for an eligible order will generally be made to the original payment method where that method supports it.</li>
          <li>The time for the refund to appear may depend on the payment provider or the bank.</li>
          <li>{site.name} will tell you the processing information that applies when the refund is confirmed.</li>
          <li>
            No fixed refund-processing deadline is promised until that operational timeframe has been confirmed. The timeframe is <OwnerNote>to be confirmed</OwnerNote>.
          </li>
          <li>Refunds and other remedies will be handled in accordance with applicable law.</li>
        </ul>
        <p>
          The store records a refund of a paid order when the payment provider confirms it. That record does not, by itself, put the shawl back in stock.
        </p>
      </section>

      <section>
        <h2>5. Shipping costs for an eligible issue</h2>
        <p>
          If an item is confirmed to have arrived damaged or incorrect, {site.name} will explain the return or replacement arrangements, and any shipping-cost treatment, before you proceed.
        </p>
        <p>Do not pay return-shipping costs for an eligible issue before you have received those instructions.</p>
      </section>

      <section>
        <h2>6. Delivery and inspection</h2>
        <p>
          Delivery is free. Estimated delivery is approximately seven days. That is an estimate, not a guaranteed delivery date.
        </p>
        <p>
          Please inspect the order when it arrives and contact us promptly if an item is damaged or incorrect. Asking you to get in touch promptly does not affect any legal right you have. Delivery details that are still open are in the <Link href="/shipping-and-delivery">Shipping & Delivery</Link> policy.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>For a cancellation request, a return or exchange, or a refund enquiry, contact:</p>
        <p>
          {site.name}
          <br />
          {site.location}
          <br />
          Phone: <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>
        </p>
        <p>Please include your order number so the purchase can be identified.</p>
      </section>

      <section>
        <h2>8. This policy and your legal rights</h2>
        <p>
          Read this policy with the <Link href="/terms-and-conditions">Terms & Conditions</Link> and the <Link href="/privacy-policy">Privacy Policy</Link>. Nothing here excludes or limits a consumer right or remedy that cannot lawfully be excluded or limited.
        </p>
        <p>
          {site.name} may update this policy when its operations or legal requirements change. The version published on the website applies, subject to applicable law and any right you already have. The effective date of this version is <OwnerNote>to be confirmed</OwnerNote>.
        </p>
      </section>
    </PolicyDocument>
  );
}
