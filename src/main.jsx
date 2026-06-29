import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ProcureProvider } from './context/ProcureContext'
import { ToastContainer } from './components/Toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProcureProvider>
      <App />
      <ToastContainer />
    </ProcureProvider>
  </React.StrictMode>,
)
