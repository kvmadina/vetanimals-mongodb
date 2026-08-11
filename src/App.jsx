import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Settings from './pages/Settings.jsx'
import VetDashboard from './pages/VetDashboard.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pets from './pages/Pets.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Cart from './pages/Cart.jsx'
import Vets from './pages/Vets.jsx'
import VetDetail from './pages/VetDetail.jsx'
import Clinics from './pages/Clinics.jsx'
import ClinicDetail from './pages/ClinicDetail.jsx'
import AppointmentNew from './pages/AppointmentNew.jsx'
import MyAppointments from './pages/MyAppointments.jsx'
import Favorites from './pages/Favorites.jsx'
import Checkout from './pages/Checkout.jsx'
import MyOrders from './pages/MyOrders.jsx'
import OrderDetails from './pages/OrderDetails.jsx'
import AdminOrders from './pages/AdminOrders.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MiniCartDrawer from './components/MiniCartDrawer.jsx'

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vet"
        element={
          <ProtectedRoute allowedRoles={['veterinarian', 'admin']}>
            <VetDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pets"
        element={
          <ProtectedRoute>
            <Pets />
          </ProtectedRoute>
        }
      />
      <Route path="/shop" element={<Shop />} />
      <Route path="/shop/:productId" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      <Route path="/vets" element={<Vets />} />
      <Route path="/vets/:vetId" element={<VetDetail />} />
      <Route path="/clinics" element={<Clinics />} />
      <Route path="/clinics/:clinicId" element={<ClinicDetail />} />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <MyAppointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/new"
        element={
          <ProtectedRoute>
            <AppointmentNew />
          </ProtectedRoute>
        }
      />
      {/* Unknown paths fall back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Global mini cart drawer (opened by Add to cart) */}
      <MiniCartDrawer />
    </>
  )
}
