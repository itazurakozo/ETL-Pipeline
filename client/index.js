import React from 'react';
import App from './App.jsx';
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';

import './styles/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>

);

