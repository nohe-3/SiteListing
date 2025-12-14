import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Use named import for BrowserRouter from react-router-dom
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { SearchHistoryProvider } from './contexts/SearchHistoryContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { PreferenceProvider } from './contexts/PreferenceContext';
import { ThemeProvider } from './hooks/useTheme';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SubscriptionProvider>
          <PlaylistProvider>
            <SearchHistoryProvider>
              <HistoryProvider>
                <PreferenceProvider>
                  <App />
                </PreferenceProvider>
              </HistoryProvider>
            </SearchHistoryProvider>
          </PlaylistProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);