import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { VikiDedicatedChat } from './components/viki/VikiDedicatedChat.tsx'

const params = new URLSearchParams(window.location.search);
const isChatMode = params.get("mode") === "viki-chat";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isChatMode ? <VikiDedicatedChat /> : <App />}
  </StrictMode>,
)
