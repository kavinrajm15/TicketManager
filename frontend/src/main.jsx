import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        },
        success: { iconTheme: { primary: '#36B37E', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#FF5630', secondary: '#fff' } },
      }}
    />
  </>,
)
