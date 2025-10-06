import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ConsultationPage from "./pages/ConsultationPage";
import CreateGymPage from "./pages/CreateGymPage";
import GymAdminPage from "./pages/GymAdminPage";
import JoinGymPage from "./pages/JoinGymPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import JoinGymPublic from "./pages/JoinGymPublic";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/consultation" element={<ConsultationPage />} />
      <Route path="/create-gym" element={<CreateGymPage />} />
      <Route path="/gym-admin" element={<GymAdminPage />} />
      <Route path="/join-gym/:token" element={<JoinGymPage />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
      <Route path="/join/:token" element={<JoinGymPublic />} />
      <Route path="/legal" element={<LegalPage />} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
