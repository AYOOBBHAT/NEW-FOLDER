import Link from "next/link";
import { OwnerNote, PolicyDocument } from "@/components/policy-document";
import { policyMetadata, site } from "@/lib/site";

export const metadata = policyMetadata(
  "Contact Us",
  "Call Kashmiriloom on +91 95412 68502. The business is in Srinagar, Jammu & Kashmir, India.",
  "/contact-us",
);

export default function ContactUsPage() {
  return (
    <PolicyDocument
      eyebrow="Customer support"
      title="Contact Us"
      lede={`${site.name} can be reached by phone. A support email address and a street address are not published.`}
    >
      <section>
        <h2>Phone</h2>
        <p>
          <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>
        </p>
      </section>
      <section>
        <h2>Location</h2>
        <p>{site.location}</p>
        <p>
          The full street address is <OwnerNote>not confirmed yet</OwnerNote>.
        </p>
      </section>
      <section>
        <h2>Website</h2>
        <p>
          <a href={site.url}>{site.url}</a>
        </p>
      </section>
      <section>
        <h2>Email</h2>
        <p>
          A customer support email address is <OwnerNote>not published</OwnerNote>. Please use the phone number above.
        </p>
      </section>
      <section>
        <h2>Orders and policies</h2>
        <p>Questions about an order, delivery, or a refund can start with a phone call. The written policies are:</p>
        <ul>
          <li>
            <Link href="/terms-and-conditions">Terms & Conditions</Link>
          </li>
          <li>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/shipping-and-delivery">Shipping & Delivery</Link>
          </li>
          <li>
            <Link href="/cancellation-and-refund">Cancellation, returns and refunds</Link>
          </li>
        </ul>
      </section>
    </PolicyDocument>
  );
}
