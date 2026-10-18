"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="wrap catalogue">
      <h1>Something went wrong.</h1>
      <button className="button" type="button" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
