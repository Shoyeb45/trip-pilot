import { AuthProvider } from "./context/auth-provider";
import { MainApp } from "./app/app";
import { Toaster } from "./components/ui/toaster";
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
