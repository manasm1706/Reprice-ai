import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Clock,
  CheckCircle,
  MapPin,
  IndianRupee,
  Calendar,
  Smartphone,
  TrendingUp,
  Users,
  Eye,
} from "lucide-react";

interface Order {
  id: string;
  phone_model: string;
  phone_variant: string;
  phone_condition: string;
  price: number;
  status: "pending" | "in-progress" | "completed";
  pickup_date: string;
  customer_name: string;
  full_address: string;
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

  /* ======================
     FETCH NEARBY ORDERS
  ====================== */
  useEffect(() => {
    if (!isLoggedIn || user?.role !== "agent") {
      navigate("/agent/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/agent/nearby-orders`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to load orders", err);
      }
    };

    fetchOrders();
  }, [isLoggedIn, user, navigate]);

  const filteredOrders = orders.filter((order) =>
    selectedFilter === "all" ? true : order.status === selectedFilter
  );

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    earnings: orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.price * 0.05, 0),
  };

  /* ======================
     UPDATE ORDER STATUS
  ====================== */
  const updateOrderStatus = async (
    orderId: string,
    newStatus: "pending" | "in-progress" | "completed"
  ) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {user?.name}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">
              Here's what's happening with your pickups today.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Orders", value: stats.total, icon: Package },
              { label: "Pending Pickups", value: stats.pending, icon: Clock },
              { label: "Completed", value: stats.completed, icon: CheckCircle },
              {
                label: "Total Earnings",
                value: `₹${stats.earnings.toLocaleString()}`,
                icon: IndianRupee,
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border p-6"
              >
                <div className="flex justify-between mb-4">
                  <stat.icon size={24} />
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Orders */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center shadow">
                <Package size={40} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold">No nearby orders</h3>
                <p className="text-gray-500">
                  Orders within 20km will appear here.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-6 rounded-2xl shadow border"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <Smartphone size={32} />
                      <div>
                        <h3 className="font-semibold">
                          {order.phone_model}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {order.phone_variant} • {order.phone_condition}
                        </p>
                        <div className="text-sm mt-2 text-gray-600">
                          <Users size={14} className="inline mr-1" />
                          {order.customer_name}
                          <br />
                          <MapPin size={14} className="inline mr-1" />
                          {order.full_address}
                          <br />
                          <Calendar size={14} className="inline mr-1" />
                          {new Date(order.pickup_date).toDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ₹{order.price.toLocaleString()}
                      </p>

                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrderStatus(order.id, "in-progress")
                          }
                        >
                          Start Pickup
                        </Button>
                      )}

                      {order.status === "in-progress" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                        >
                          Complete
                        </Button>
                      )}

                      <Button size="sm" variant="outline">
                        <Eye size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
