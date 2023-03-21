import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import App from './App';

import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: "rgb(239, 62, 45)"
    },
    background: {
      default: "#222",
      paper: "#333",
    }
  },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode>
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
</React.StrictMode>);
