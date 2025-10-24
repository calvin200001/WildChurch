import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'maplibre-gl/dist/maplibre-gl.css'; // Corrected maplibre-gl CSS import
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider> {/* Wrap App with HelmetProvider */}
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)