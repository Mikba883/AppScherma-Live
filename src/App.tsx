import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ConsultationPage from "./pages/ConsultationPage";
import CreateGymPage from "./pages/CreateGymPage";
import GymAdminPage from "./pages/GymAdminPage";
import JoinGymPage from "./pages/JoinGymPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import JoinGymPublic from "./pages/JoinGymPublic";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
