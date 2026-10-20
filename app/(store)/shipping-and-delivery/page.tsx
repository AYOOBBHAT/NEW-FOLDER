import Link from "next/link";
import { OwnerNote, PolicyDocument } from "@/components/policy-document";
import { policyMetadata, site } from "@/lib/site";

export const metadata = policyMetadata(
  "Shipping & Delivery",
  "Kashmiriloom offers free delivery. The estimate is approximately 7 days and is not a guaranteed deadline.",
  "/shipping-and-delivery",
);

export default function ShippingAndDeliveryPage() {
  return (
    <PolicyDocument
      eyebrow="Store policy"
      title="Shipping & Delivery"
      lede="Published 20 October 2026. Delivery is free. The timing below is an estimate, not a promised delivery date."
    >
      <section>
        <h2>Delivery charge</h2>
        <p>
          Delivery is free. Checkout records a shipping amount of zero. Applicable taxes are included in the displayed product prices and are not added again as a delivery charge. The server calculates the order total.
        </p>
      </section>

      <section>
        <h2>Estimated time</h2>
        <p>
          Estimated delivery is approximately 7 days. That is not a guaranteed deadline, and it is not a promise that every order will arrive on a named day.
        </p>
        <p>
          Exceptional delays may occur, including delays after the order has left the store. A delay does not by itself change the price or create a refund. Cancellation, returns, exchanges, and refunds are in the <Link href="/cancellation-and-refund">cancellation, return, refund and exchange policy</Link>.
        </p>
      </section>

      <section>
        <h2>What is still unconfirmed</h2>
        <p>The store has not published these delivery details:</p>
        <ul>
          <li>
            Carrier: <OwnerNote>to be confirmed by the store owner</OwnerNote>
          </li>
          <li>
            Tracking: <OwnerNote>to be confirmed by the store owner</OwnerNote>
          </li>
          <li>
            Exact dispatch time: <OwnerNote>to be confirmed by the store owner</OwnerNote>
          </li>
          <li>
            The list of places that can be delivered to: <OwnerNote>to be confirmed by the store owner</OwnerNote>
          </li>
        </ul>
        <p>
          Checkout accepts the address you enter. Until a coverage list is published, do not read this page as a promise that every address can be served. The business location is {site.location}. That location is not a service-area map.
        </p>
      </section>

      <section>
        <h2>Your address</h2>
        <p>
          Delivery depends on the name, phone number, and address you give at checkout. Check them before you place the order. If they are incomplete or wrong, the parcel may not arrive. Questions can go to{" "}
          <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>, or start from the <Link href="/contact-us">Contact Us</Link> page.
        </p>
      </section>
    </PolicyDocument>
  );
}
