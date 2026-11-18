import { createRoot } from 'react-dom/client'
import './styles.css'
import { AppProvider } from './lib/store'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>
)
