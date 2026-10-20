import Link from "next/link";
import { OwnerNote, PolicyDocument } from "@/components/policy-document";
import { policyMetadata, site } from "@/lib/site";

export const metadata = policyMetadata(
  "Terms & Conditions",
  "Terms for shopping at Kashmiriloom, including prices with tax included, free delivery, payment verification, and the 30-minute unpaid stock hold.",
  "/terms-and-conditions",
);

export default function TermsAndConditionsPage() {
  return (
    <PolicyDocument
      eyebrow="Store policy"
      title="Terms & Conditions"
      lede="Published 20 October 2026. These terms describe how Kashmiriloom takes an order. Items still awaiting a decision are marked for the store owner."
    >
      <section>
        <h2>1. Who you are buying from</h2>
        <p>
          The public name of this shop is {site.name}. The website is {site.url}. The business location is {site.location}. Customer support is by phone at{" "}
          <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>.
        </p>
        <p>
          The registered legal name and the full postal address are <OwnerNote>not confirmed yet</OwnerNote>. A support email address and a tax registration number, such as a GSTIN, are also <OwnerNote>not published</OwnerNote>. The brand name on this website is not a substitute for those details.
        </p>
      </section>

      <section>
        <h2>2. Acceptance</h2>
        <p>
          Placing an order means you accept these terms, the product page, and the checkout summary for that order. If you do not accept them, do not place the order.
        </p>
      </section>

      <section>
        <h2>3. Products and availability</h2>
        <p>
          A product page shows the name, the price, and the details recorded for that piece. Fibre, craft, colour, technique, and origin appear only when they have been entered for that product. A photograph is not a statement that a shawl is pure Pashmina, certified, handmade, or made from a particular material.
        </p>
        <p>
          Colour on a screen can differ from the cloth. A piece can be ordered while it is published and the store can confirm it, including a piece offered as made to order. The store can decline the order if the piece is no longer available when checkout is checked.
        </p>
      </section>

      <section>
        <h2>4. Prices, taxes, and the amount you pay</h2>
        <p>
          Prices are shown in Indian rupees as whole rupees. Applicable taxes are included in the displayed product prices. The website does not add a further tax on top of that price.
        </p>
        <p>
          The amount due is calculated on the server, not in the browser. It uses the current catalogue price and the quantity, then applies the store’s shipping, discount, and tax amounts. Delivery is free, so the shipping amount is zero. The separate discount amount and the separate tax amount are also zero, because no extra discount is applied and tax is already included in the displayed price. The checkout page shows this total before the order is placed, and the order keeps a copy of the product name, SKU, unit price, quantity, shipping, discount, and tax.
        </p>
        <p>
          If the catalogue price changes before you submit checkout, the server rejects the old total and asks you to review the bag. The store does not treat a typed-in total as the price.
        </p>
      </section>

      <section>
        <h2>5. Payment and confirmation</h2>
        <p>
          Sending checkout creates an order that is waiting for payment. It is not a paid order. When online payment is switched on, you pay through the store’s payment provider. The store marks the order paid, and moves it to confirmed, only after it has verified that payment. A screenshot or an unverified message is not payment.
        </p>
        <p>
          Online payment is not treated as available until the store has configured it. This page is not an approval from any payment provider.
        </p>
      </section>

      <section>
        <h2>6. Stock hold</h2>
        <p>
          Where the store counts stock for a piece, that stock is reserved when the unpaid order is created. The hold lasts 30 minutes. If payment is not verified in that time, the hold ends, the reserved stock is released, and the unpaid order is cancelled. A made-to-order piece is not taken from a counted stock figure. The store will not sell the same counted unit twice while it is reserved.
        </p>
      </section>

      <section>
        <h2>7. Cancellation, delivery, and your details</h2>
        <p>
          You may ask to cancel before the order has been dispatched, by calling the support number and giving the order number. That request is confirmed only if the order has not already been dispatched. While the order is still waiting for payment, you can also cancel it on the order page. After payment is verified, the website has no cancel button. Returns are for items that arrive damaged or incorrect. A change-of-mind return is not accepted. No cancellation fee is specified. The full rules are in the <Link href="/cancellation-and-refund">cancellation, return, refund and exchange policy</Link>.
        </p>
        <p>
          Delivery is free. The estimate is approximately 7 days, and that estimate is not a guaranteed deadline. Read the <Link href="/shipping-and-delivery">Shipping & Delivery</Link> policy for what is still unconfirmed, including the carrier and the places the store delivers.
        </p>
        <p>
          Checkout asks for your name, email address, phone number, and delivery address. Those details need to be accurate. The store does not use customer accounts. The order page opens in the browser session that placed the order.
        </p>
      </section>

      <section>
        <h2>8. The website and liability</h2>
        <p>
          The text, layout, and photographs on this website belong to their owners. You may use them to shop. You may not copy them for another shop unless the owner agrees or the law allows it.
        </p>
        <p>
          The website can be unavailable during maintenance or a fault. If a price or description is wrong and payment has not been verified, the store may cancel that unpaid order. These terms do not remove a right that the law gives you and that a shop is not allowed to take away.
        </p>
        <p>
          The courts and the governing-law wording are <OwnerNote>still to be confirmed by the store owner</OwnerNote>. The business location above is not that choice of court.
        </p>
      </section>

      <section>
        <h2>9. Privacy and changes</h2>
        <p>
          Personal information used for an order is described in the <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>
        <p>
          A newer version of these terms may replace this page. The version published when you place an order applies to that order, together with the amounts stored on the order.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Phone <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>. Location: {site.location}. More ways to reach the shop are on the <Link href="/contact-us">Contact Us</Link> page.
        </p>
      </section>
    </PolicyDocument>
  );
}
