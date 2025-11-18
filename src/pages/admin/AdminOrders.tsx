import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-gray-200 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", search, filter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("delivery_status", filter);
      if (search.trim()) query = query.ilike("customer_name", `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: string;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Order updated successfully" });
      queryClient.invalidateQueries(["orders"]);
    },
    onError: (err) => {
      console.error(err);
      toast({ title: "Failed to update order", variant: "destructive" });
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
          <h1 className="text-3xl font-bold">Manage Orders</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p>Loading orders...</p>
        ) : orders?.length === 0 ? (
          <p className="text-muted-foreground">No orders found.</p>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-all">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="flex justify-between w-full">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <Badge
                      className={
                        statusColors[order.delivery_status] || "bg-gray-200"
                      }
                    >
                      {order.delivery_status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-2">
                  <p>
                    <strong>Customer:</strong> {order.customer_name}
                  </p>
                  <p>
                    <strong>Email:</strong> {order.customer_email}
                  </p>
                  <p>
                    <strong>Amount:</strong> £{order.amount?.toFixed(2)}
                  </p>
                  <p>
                    <strong>Tracking:</strong> {order.tracking_number}
                  </p>
                  <p>
                    <strong>Estimated Delivery:</strong>{" "}
                    {new Date(
                      order.estimated_delivery_date
                    ).toLocaleDateString()}
                  </p>
                  <div className="flex justify-end gap-2 mt-3">
                    <Select
                      onValueChange={(newStatus) =>
                        updateMutation.mutate({ id: order.id, newStatus })
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (
                          confirm("Are you sure you want to delete this order?")
                        ) {
                          await supabase
                            .from("orders")
                            .delete()
                            .eq("id", order.id);
                          queryClient.invalidateQueries(["orders"]);
                          toast({ title: "Order deleted" });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
