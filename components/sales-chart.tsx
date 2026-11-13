'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
export function SalesChart({ data }: { data: { date: string; sales: number; orders: number }[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Gráfico de ventas en euros por día; cifras detalladas en la tabla de pedidos"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#d6d8ce" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="sales" name="Ventas TEST (€)" fill="#606b53" />
          <Bar dataKey="orders" name="Pedidos" fill="#b2b6a2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
