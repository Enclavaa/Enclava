import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { HeroSection } from "./components/HeroSection";
import { WhySection } from "./components/WhySection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { SeiSection } from "./components/SeiSection";
import { CTASection } from "./components/CTASection";
import { Marketplace } from "./pages/Marketplace";
import UploadDataset from "./pages/UploadDataset";
import DatasetDetails from "./pages/DatasetDetails";
import ProfileDashboard from "./pages/ProfileDashboard";
import Transactions from "./pages/Transactions";
import Chat from "./pages/Chat";

function App() {
  return (
    <Router>
      <div className="font-sans antialiased">
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar for desktop */}
          <Sidebar />

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
            {/* Mobile Navbar */}
            <Navbar />

            {/* Page content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
              <Routes>
                <Route
                  path="/"
                  element={
                    <div className="bg-white">
                      <HeroSection />
                      <WhySection />
                      <HowItWorksSection />
                      <SeiSection />
                      <CTASection />
                    </div>
                  }
                />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/upload-dataset" element={<UploadDataset />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/dataset/:id" element={<DatasetDetails />} />
                <Route path="/profile" element={<ProfileDashboard />} />
                <Route path="/transactions" element={<Transactions />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
