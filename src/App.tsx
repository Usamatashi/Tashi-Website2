import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth";

const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Career = lazy(() => import("@/pages/Career"));
const Products = lazy(() => import("@/pages/Products"));
const Contact = lazy(() => import("@/pages/Contact"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
const Login = lazy(() => import("@/pages/Login"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const DeleteAccount = lazy(() => import("@/pages/DeleteAccount"));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-white text-ink-800">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/login" element={<Login />} />
              <Route path="/policy" element={<PrivacyPolicy />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
