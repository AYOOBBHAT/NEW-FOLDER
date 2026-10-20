import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Draft terms for shopping at Shawl House. Orders, prices, delivery, and customer duties are explained in plain language. Business details still need review before launch.",
  alternates: { canonical: "/terms-and-conditions" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms & Conditions · Shawl House",
    description:
      "Draft terms for shopping at Shawl House, including orders, prices, and delivery. Review the marked items before launch.",
    url: "/terms-and-conditions",
    type: "article",
  },
};

export default function TermsAndConditionsPage() {
  return (
    <article className="legal">
      <div className="wrap legal-doc">
        <p className="eyebrow">Store policy</p>
        <h1>Terms & Conditions</h1>
        <p className="muted">Draft dated 19 October 2026. This page is a general store policy for review. It is not a finished legal document.</p>
        <div className="legal-draft">
          <strong>Complete this draft before launch</strong>
          <p>
            Shawl House should have these terms read by its own adviser. Items marked “To be completed by the site owner” are missing from the website configuration. Do not send this page to a payment provider until those items, and the policies listed at the end, are filled in.
          </p>
        </div>

        <section>
          <h2>1. Introduction and acceptance</h2>
          <p>
            These terms explain how shopping works on this website. Shawl House sells shawls through an online catalogue. The name on the website is Shawl House.
          </p>
          <p>
            If you browse the catalogue or place an order, you accept the version of these terms published on this page at that time, together with the product page and the checkout summary for that order. If you do not accept them, do not place an order.
          </p>
        </section>

        <section>
          <h2>2. Business and contact information</h2>
          <p>The shop is presented publicly as Shawl House. The website does not yet store the legal details a customer or a payment provider may need.</p>
          <ul>
            <li>Registered legal name: <span className="legal-gap">To be completed by the site owner.</span></li>
            <li>Registered address: <span className="legal-gap">To be completed by the site owner.</span></li>
            <li>Customer support email: <span className="legal-gap">To be completed by the site owner.</span></li>
            <li>Customer support phone: <span className="legal-gap">To be completed by the site owner.</span></li>
            <li>Registration or tax identification, where the business is required to publish it: <span className="legal-gap">To be completed by the site owner.</span></li>
          </ul>
          <p>Do not treat the storefront name as a registered company name. Add the registered details here before launch.</p>
        </section>

        <section>
          <h2>3. Products, materials, photographs, and availability</h2>
          <p>
            Each published product page shows the name, the price, and the details the store has recorded for that piece. Fibre, craft, colour, technique, and place of origin appear only when they have been entered for that product. A photograph is not a claim that a shawl is pure Pashmina, certified, handmade, or made from any particular material.
          </p>
          <p>
            Colour on a screen can differ from the cloth. Stock can change. A piece can be ordered only while it is published and the store can confirm it, including pieces offered as made to order. The store may decline an order if the piece is no longer available when checkout is confirmed.
          </p>
        </section>

        <section>
          <h2>4. Prices, taxes, and payment</h2>
          <p>
            Prices are shown in Indian rupees as whole rupees. The store calculates the amount due. That amount is the current unit price multiplied by the quantity, plus shipping, minus any discount, plus any tax. The browser does not set those figures.
          </p>
          <p>
            Shipping, discount, and tax are store rules. In the checkout used with this draft, each of those three amounts is zero, so the total matches the sum of the item prices. If the store changes those rules, the checkout page shows the new amounts before the order is placed, and the order keeps the amounts that were accepted.
          </p>
          <p>
            Which taxes apply, and the full list of payment methods, are <span className="legal-gap">to be completed by the site owner.</span> When online payment is switched on, payment is taken by the store’s payment provider. An order stays unpaid until the store has verified that payment. A screenshot or an unverified message is not treated as payment.
          </p>
        </section>

        <section>
          <h2>5. Orders, acceptance, and cancellation</h2>
          <p>
            Sending the checkout form asks the store to create an order. The store accepts that request when the bag is valid, the total still matches the amount calculated by the store, and any counted stock can be reserved. You then receive an order number.
          </p>
          <p>
            Counted stock is held for 30 minutes while payment is outstanding. If payment is not verified in that time, the hold ends and the stock goes back on sale. You can cancel on the website only while the order is still waiting for payment. After payment is verified, the website does not offer a cancel button.
          </p>
          <p>
            A rule for cancelling a paid order, and any cancellation charge, are <span className="legal-gap">to be completed by the site owner.</span> This draft does not add a cancellation charge, and the store is not configured to take one. The store may cancel an order that is still unpaid if payment fails or the hold expires.
          </p>
        </section>

        <section>
          <h2>6. Shipping and delivery</h2>
          <p>
            The order stores the shipping amount calculated at checkout. A delivery area, a carrier, and a number of days for delivery are <span className="legal-gap">to be completed by the site owner.</span> Nothing on this page promises a delivery date.
          </p>
          <p>
            Delivery depends on the address you provide and on the carrier. The store cannot promise delivery to every place until a shipping policy is published. Risk, insurance, and what happens if a parcel cannot be delivered are also <span className="legal-gap">to be completed by the site owner.</span>
          </p>
        </section>

        <section>
          <h2>7. Returns, exchanges, refunds, and damaged or incorrect items</h2>
          <p>
            A return window, an exchange rule, a refund amount, and the steps for a damaged or incorrect item are <span className="legal-gap">to be completed by the site owner.</span> This page does not state a number of days or a refund percentage, because those figures are not in the store configuration.
          </p>
          <p>
            These terms do not remove a right that the law gives you and that a shop is not allowed to take away. That includes rights that apply when goods are faulty, damaged, or not what was ordered, where such rights exist.
          </p>
        </section>

        <section>
          <h2>8. Your responsibilities</h2>
          <p>
            Give a name, email address, phone number, and delivery address that a carrier can use. Check them before you place the order. If they are incomplete or wrong, the parcel may not arrive, and the store may not be able to correct the delivery from the details on the order.
          </p>
          <p>
            The store does not use customer accounts. Your order page is tied to the browser session from checkout. Keep that session private. Someone else should not be able to open your order from a shared browser.
          </p>
        </section>

        <section>
          <h2>9. Intellectual property</h2>
          <p>
            The text, layout, photographs, and names on this website belong to their owners. You may use them to look at and buy from the catalogue. You may not copy them for another shop, or remove a credit, unless the owner agrees in writing or the law allows it. A product photograph is there to show the piece. It is not a licence to reuse the image.
          </p>
        </section>

        <section>
          <h2>10. Website availability and liability</h2>
          <p>
            The website can be offline for maintenance or because of a fault. A price or description can be wrong. If the store finds a mistake before payment is verified, it may cancel that unpaid order rather than charge the incorrect amount.
          </p>
          <p>
            The store does not exclude liability that the law does not allow it to exclude or limit. Any tighter limit needs a choice of law and a review by the business. That limit is <span className="legal-gap">to be completed by the site owner.</span>
          </p>
        </section>

        <section>
          <h2>11. Privacy and personal data</h2>
          <p>
            Checkout asks for your name, email address, phone number, and delivery address so the store can record the order and arrange delivery. Payment references are used to confirm whether a payment succeeded. This draft does not authorise the sale of that information.
          </p>
          <p>
            A separate privacy notice is not published on this website yet. When it is, it will be the{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>. Until that page exists, this section is only a short description, not a complete privacy notice.
          </p>
        </section>

        <section>
          <h2>12. Applicable law and disputes</h2>
          <p>
            The governing law, the courts, and any dispute process are <span className="legal-gap">to be completed by the site owner.</span> This draft does not name a country, state, or city. Rights that mandatory law gives a customer stay in place.
          </p>
        </section>

        <section>
          <h2>13. Changes to these terms</h2>
          <p>
            The store may replace this page with a newer version. The version on this page when you place an order applies to that order, along with the prices and amounts stored on the order. The site owner should keep a record of each published version.
          </p>
        </section>

        <section>
          <h2>14. Customer support</h2>
          <p>
            Support email, phone, and postal address are <span className="legal-gap">to be completed by the site owner.</span> Until those details are published on this website, there is no other support channel stated in these terms.
          </p>
        </section>

        <section>
          <h2>Policies still to be published</h2>
          <p>These pages are not on the website yet. They should be written before the site is submitted for payment verification:</p>
          <ul>
            <li>Privacy Policy</li>
            <li>Contact Us</li>
            <li>Shipping and Delivery Policy</li>
            <li>Cancellation and Refund Policy</li>
          </ul>
        </section>
      </div>
    </article>
  );
}
