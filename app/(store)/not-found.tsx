import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap catalogue">
      <p className="eyebrow">Catalogue</p>
      <h1>That page is not in the shop.</h1>
      <p>
        <Link className="button" href="/shop">
          Shop all
        </Link>
      </p>
    </section>
  );
}
