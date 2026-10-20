import Link from "next/link";
import { OwnerNote, PolicyDocument } from "@/components/policy-document";
import { policyMetadata, site } from "@/lib/site";

export const metadata = policyMetadata(
  "Privacy Policy",
  "How Kashmiriloom handles the details used for browsing, the shopping bag, checkout, delivery, support calls, and payment verification.",
  "/privacy-policy",
);

export default function PrivacyPolicyPage() {
  return (
    <PolicyDocument
      eyebrow="Store policy"
      title="Privacy Policy"
      lede="Published 20 October 2026. This notice describes the data this website actually uses. It does not claim a certification or a practice the site does not have."
    >
      <section>
        <h2>Who this notice covers</h2>
        <p>
          This notice is for shoppers on {site.url}, the website of {site.name}, located in {site.location}. Support requests by phone use{" "}
          <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>. The registered legal name is <OwnerNote>not confirmed yet</OwnerNote>.
        </p>
      </section>

      <section>
        <h2>Browsing</h2>
        <p>
          Opening a page sends your browser’s request to the website so the page can be shown. This shop does not install an analytics tool, an advertising tool, or a marketing cookie. It does not build an advertising profile from the pages you view.
        </p>
        <p>
          The business has not published a separate rule for records that a hosting company may keep on its own. That retention period is <OwnerNote>not confirmed</OwnerNote>.
        </p>
      </section>

      <section>
        <h2>Shopping bag cookie</h2>
        <p>
          When you add a shawl to the bag, the site stores a cookie named shawl_cart. The cookie holds a random guest token. It is an httpOnly cookie, which means page scripts cannot read it. In production the browser sends it only over HTTPS. It is kept for 30 days and is refreshed when the bag changes.
        </p>
        <p>
          The server stores a hash of that token, together with the product and quantity in the bag. It does not use the cookie to advertise to you. The cookie is how the site remembers the bag and how it shows the order placed from that browser. There is no customer account.
        </p>
      </section>

      <section>
        <h2>Checkout, fulfilment, and support</h2>
        <p>Checkout stores the details you submit:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Delivery address, including street, city, state, postal code, and country</li>
          <li>The order contents: product name, SKU when one exists, unit price, quantity, shipping, discount, and tax</li>
        </ul>
        <p>
          Those details are used to create the order, reserve counted stock, and arrange delivery. The website does not send an order email of its own, and it does not send marketing email. The email address is kept with the order.
        </p>
        <p>
          Another person cannot open your order from the website unless they have the browser session that placed it. Staff can see orders in the private admin area so they can fulfil them.
        </p>
        <p>
          If you call the published support number, the call is the support contact. This website does not store a support form or a ticket. What is said on a phone call is not copied into the website by an automatic tool.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          When online payment is switched on, the pay button loads the payment provider’s checkout. Card, UPI, or other payment details are entered there, not into a card field on this website. This store keeps the provider’s order reference and, after a verified payment, the payment reference. It does not keep a card number.
        </p>
        <p>
          An order is marked paid only after the store checks the payment provider’s signature, or a verified webhook from that provider. The store does not claim a security certification for this process.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <p>The website uses these providers for the work described:</p>
        <ul>
          <li>A hosted database for products, the shopping bag, and orders</li>
          <li>An image host for product photographs</li>
          <li>The payment provider, when online payment is switched on, to take and confirm payment</li>
        </ul>
        <p>
          Product photographs are catalogue images. The checkout form does not ask you to upload a personal photograph. The site does not sell customer details.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          The bag cookie is httpOnly. Payment updates are accepted only when the provider’s check succeeds. This notice does not claim a particular security certification, and it does not promise that storage or transmission is free of risk.
        </p>
      </section>

      <section>
        <h2>How long information is kept</h2>
        <p>
          Bag records are removed after they expire. The bag lifetime is 30 days from the last change. Orders are kept so the store can fulfil them and keep a record of the sale. An automatic deletion date for orders is <OwnerNote>not configured and not confirmed</OwnerNote>. There is no button on the website that deletes your order.
        </p>
      </section>

      <section>
        <h2>Privacy requests</h2>
        <p>
          You can ask about the order details the store holds by calling <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>. The website has no form for access, correction, or deletion. A response time for those requests is <OwnerNote>not confirmed by the store owner</OwnerNote>.
        </p>
        <p>
          Rights that the law gives you about your personal information are not removed by this notice. Which of those rights apply, and how the store will meet them, still needs the owner’s confirmation where this page marks a gap.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          A newer version of this notice may replace this page. Related pages: <Link href="/terms-and-conditions">Terms & Conditions</Link> and <Link href="/contact-us">Contact Us</Link>.
        </p>
      </section>
    </PolicyDocument>
  );
}
