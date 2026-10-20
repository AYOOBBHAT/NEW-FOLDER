import Link from "next/link";
import { adminDatabaseNotice } from "@/components/admin/database-notice";
import { FulfillOrder } from "@/components/admin/fulfill-order";
import { formatPrice } from "@/lib/format";
import { getDb } from "@/lib/mongodb";
import type { OrderDoc } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  try {
    const orders = await (await getDb())
      .collection<OrderDoc>("orders")
      .find()
      .project({
        number: 1,
        buyerName: 1,
        total: 1,
        status: 1,
        paymentStatus: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .toArray();
    return (
      <>
        <h1>Orders</h1>
        <p className="help">Payment stays unpaid until Razorpay signature or webhook verification succeeds. Live payments are not enabled.</p>
        {orders.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id.toHexString()}>
                    <td>{order.number}</td>
                    <td>{order.buyerName}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>{order.status}</td>
                    <td>{order.paymentStatus}</td>
                    <td>
                      {order.status === "confirmed" ? <FulfillOrder id={order._id.toHexString()} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No orders yet.</p>
        )}
        <p>
          <Link href="/admin">Overview</Link>
        </p>
      </>
    );
  } catch (error) {
    return adminDatabaseNotice(error);
  }
}
