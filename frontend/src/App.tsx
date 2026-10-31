import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Architecture from '@/pages/Architecture';
import Systems from '@/pages/Systems';
import Products from '@/pages/Products';
import Requirements from '@/pages/Requirements';
import Disposals from '@/pages/Disposals';
import Indicators from '@/pages/Indicators';
import Plans from '@/pages/Plans';
import PlanDetailPage from '@/pages/Plans/detail';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/systems" element={<Systems />} />
        <Route path="/products" element={<Products />} />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/disposals" element={<Disposals />} />
        <Route path="/indicators" element={<Indicators />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:id" element={<PlanDetailPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
