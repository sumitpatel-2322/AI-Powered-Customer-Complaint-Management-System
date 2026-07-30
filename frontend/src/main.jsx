import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import complaintReducer from './store/complaintSlice';
import App from './App';

// Configure Redux Store
const store = configureStore({
    reducer: {
        complaint: complaintReducer,
    },
});

// Mount the React Application
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>
);