import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Listings from "@/pages/Listings";
import ListingDetail from "@/pages/ListingDetail";
import AdminListings from "@/pages/AdminListings";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Notifications from "@/pages/Notifications";
import AgentProfile from "@/pages/AgentProfile";
import Events from "@/pages/Events";
import Resources from "@/pages/Resources";
import TrackingLinks from "@/pages/TrackingLinks";
import PosterGenerator from "@/pages/PosterGenerator";
import TeamDashboard from "@/pages/TeamDashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/admin/listings" element={<ProtectedRoute requiredRole="pm"><AdminListings /></ProtectedRoute>} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<AgentProfile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/tracking" element={<TrackingLinks />} />
              <Route path="/posters" element={<PosterGenerator />} />
              <Route path="/team" element={<ProtectedRoute requiredRole="pm"><TeamDashboard /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
