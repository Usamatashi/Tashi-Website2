import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Career from "@/pages/Career";
import Products from "@/pages/Products";
import Contact from "@/pages/Contact";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/components/AdminLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminOrders from "@/pages/AdminOrders";
import AdminOrderDetail from "@/pages/AdminOrderDetail";
import AdminWholesaleOrderDetail from "@/pages/AdminWholesaleOrderDetail";
import AdminProducts from "@/pages/AdminProducts";
import AdminClaims from "@/pages/AdminClaims";
import AdminPayments from "@/pages/AdminPayments";
import AdminCommission from "@/pages/AdminCommission";
import AdminSalesmanDetail from "@/pages/AdminSalesmanDetail";
import AdminQRCodes from "@/pages/AdminQRCodes";
import AdminAds from "@/pages/AdminAds";
import AdminTicker from "@/pages/AdminTicker";
import AdminUsers from "@/pages/AdminUsers";
import AdminRegions from "@/pages/AdminRegions";
import AdminWhatsapp from "@/pages/AdminWhatsapp";
import AdminSuperConfig from "@/pages/AdminSuperConfig";
import AdminTeam from "@/pages/AdminTeam";

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/wholesale/:docId" element={<AdminWholesaleOrderDetail />} />
          <Route path="orders/:orderId" element={<AdminOrderDetail />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="claims" element={<AdminClaims />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="commission" element={<AdminCommission />} />
          <Route path="commission/salesman/:salesmanId" element={<AdminSalesmanDetail />} />
          <Route path="qr-codes" element={<AdminQRCodes />} />
          <Route path="ads" element={<AdminAds />} />
          <Route path="ticker" element={<AdminTicker />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="regions" element={<AdminRegions />} />
          <Route path="whatsapp" element={<AdminWhatsapp />} />
          <Route path="super-config" element={<AdminSuperConfig />} />
          <Route path="team" element={<AdminTeam />} />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink-800">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/team" element={<Navigate to="/about" replace />} />
          <Route path="/culture" element={<Navigate to="/about" replace />} />
          <Route path="/career" element={<Career />} />
          <Route path="/quality" element={<Navigate to="/" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
