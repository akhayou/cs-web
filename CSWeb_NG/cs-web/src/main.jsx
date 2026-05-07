import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { loadConfig } from './services/config.js';
import { AppProvider } from './context/AppContext.jsx';

loadConfig().then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <AppProvider>
                {' '}
                {/* ← ADD */}
                <App />
            </AppProvider>{' '}
            {/* ← ADD */}
        </React.StrictMode>,
    );
});

// loadConfig()
//     .then(() => {
//         ReactDOM.createRoot(document.getElementById('root')).render(
//             <React.StrictMode>
//                 <App />
//             </React.StrictMode>,
//         );
//     })
//     .catch(() => {
//         document.getElementById('root').innerHTML = '<p style="color:red;padding:2rem">Failed to load config.json</p>';
//     });

// ReactDOM.createRoot(document.getElementById('root')).render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>,
// );
